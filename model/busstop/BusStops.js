'use strict';

const connection = require("../../database/database");
const logger = require("../../util/logger");

const FeatureList = require("../realtime/FeatureList");
const LineUtils = require("../line/LineUtils");

module.exports = class BusStops {

    constructor(outputFormat) {
        this.outputFormat = outputFormat;
    }

    setLines(lines) {
        this.lines = lines;
    }

    getNextStops(tripId) {
        return Promise.resolve(`
            SELECT rec_ort.onr_typ_nr,
                lid_verlauf.li_lfd_nr,
                rec_ort.ort_nr,
                rec_ort.ort_name,
                rec_ort.ort_ref_ort_name,
                COALESCE(vpa.delay_sec, 0) delay_sec,
                SUBSTRING(((departure + COALESCE(travel_time, 0) + COALESCE(delay_sec, 0)) * INTERVAL '1 sec')::text, 0, 6) AS time_est,
                direction,
                ST_AsGeoJSON(rec_ort.the_geom) as json_geom
                
            FROM data.vehicle_positions vpa
            
            INNER JOIN data.rec_frt
                ON rec_frt.teq=vpa.trip
                
            INNER JOIN data.rec_lid
                ON rec_frt.line=rec_lid.line
                AND rec_frt.variant=rec_lid.variant
                
            INNER JOIN data.lid_verlauf
                ON rec_frt.line=lid_verlauf.line
                AND rec_frt.variant=lid_verlauf.variant
                AND vpa.li_lfd_nr < lid_verlauf.li_lfd_nr
                
            LEFT JOIN data.travel_times
                ON lid_verlauf.li_lfd_nr = li_lfd_nr_end
                AND travel_times.trip=rec_frt.trip
                
            LEFT JOIN data.rec_ort
                ON lid_verlauf.onr_typ_nr =  rec_ort.onr_typ_nr
                AND lid_verlauf.ort_nr = rec_ort.ort_nr
                
            WHERE rec_frt.trip = ${tripId}
            ORDER BY time_est
        `)
            .then(sql => connection.query(sql))
            .then(results => {
                let featureList = new FeatureList();

                for (let row of results.rows) {
                    let geometry = JSON.parse(row.json_geom);
                    delete row.json_geom;

                    featureList.add(row, geometry);
                }

                return featureList.getFeatureCollection()
            });
    }

    getStops() {
        return Promise.resolve(
            `SELECT rec_ort.onr_typ_nr,
                rec_ort.ort_nr,
                rec_ort.ort_name,
                rec_ort.ort_ref_ort_name,
                ST_AsGeoJSON(rec_ort.the_geom) as json_geom
            FROM  data.rec_ort `
        )
            .then(sql => {
                // noinspection EqualityComparisonWithCoercionJS
                if (this.lines != null) {
                    logger.debug(`Filter active: lines='${this.lines}'`);

                    sql +=
                        `INNER JOIN data.lid_verlauf
                                ON lid_verlauf.ort_nr=rec_ort.ort_nr
                                AND lid_verlauf.onr_typ_nr=rec_ort.onr_typ_nr
                         WHERE `;

                    sql += LineUtils.buildForSql('lid_verlauf.line', 'lid_verlauf.variant', this.lines);
                }

                return sql;
            })
            .then(sql => connection.query(sql))
            .then(result => {
                let featureList = new FeatureList();

                for (let row of result.rows) {
                    let geometry = JSON.parse(row.json_geom);
                    delete row.json_geom;

                    featureList.add(row, geometry);
                }

                return featureList.getFeatureCollection();
            });
    }

    getStopsByIds(stopIds) {
        return Promise.resolve(
            `SELECT 
                ro.onr_typ_nr AS type,
                ro.ort_nr AS id,
                ro.ort_name AS name,
                ro.ort_ref_ort_name AS refName,
                ST_Y(ST_Transform(ro.the_geom, 4326)) AS latitude,
                ST_X(ST_Transform(ro.the_geom, 4326)) AS longitude
            FROM data.rec_ort AS ro
            WHERE ro.ort_nr IN ('${stopIds.join("','")}')`
        )
        .then(sql => connection.query(sql))
        .then(results => results.rows);
    }

    getStopsForApp(tripId, stopIds, timeFrom, timeTo) {
        const reducer = (accumulator, currentValue) => accumulator + ', '  + currentValue;
        return Promise.resolve(`
             select * from (
                    select * from data.stop_times
                    where 
                    trip_id = ${tripId} AND
                    stop_id IN (${stopIds.reduce(reducer)}) AND
                    departure_time > '${timeFrom}'
            ) as filtered 
            where departure_time < '${timeTo}'
        `)
            .then(sql => connection.query(sql))
            .then(results => { 
                return results.rows;
            });
    }

    getTrips(tripIds) {

        return Promise.resolve(`
            SELECT
                rf.trip AS "tripId",
                rf.line AS "line",
                rf.trip_type AS "type",
                rf.variant AS "variant",
                rf.service AS "service"
            FROM data.rec_frt AS rf
            WHERE rf.trip IN ('${tripIds.join("','")}')
        `)
        .then(sql => connection.query(sql))
        .then(results => results.rows);

    }

    getTripStops(tripIds) {

        return Promise.resolve(`
            SELECT
                rf.trip AS "tripId",
                lv.ort_nr AS "stopId",
                ro.ort_name AS "stopName",
                ((rf.departure + COALESCE(tt.travel_time, 0)) * INTERVAL '1 sec')::text AS "arrivalTime",
                ((rf.departure + COALESCE(tt.travel_time, 0)) * INTERVAL '1 sec')::text AS "departureTime",
                ST_Y(ST_Transform(ro.the_geom, 4326)) AS "latitude",
                ST_X(ST_Transform(ro.the_geom, 4326)) AS "longitude"
            FROM data.rec_frt AS rf
            INNER JOIN data.lid_verlauf AS lv ON rf.line = lv.line AND rf.variant = lv.variant
            INNER JOIN data.rec_ort AS ro ON lv.ort_nr = ro.ort_nr
            LEFT JOIN data.travel_times AS tt ON tt.trip = rf.trip AND tt.li_lfd_nr_end = lv.li_lfd_nr
            WHERE rf.trip IN ('${tripIds.join("','")}')
            ORDER BY rf.trip ASC, lv.li_lfd_nr ASC;`
        )
        .then(sql => connection.query(sql))
        .then(results => results.rows);

    }

};
