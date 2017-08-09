'use strict';

let config = {};

config.coordinate_etrs89 = 25832;  // ETRS89, UTM zone 32N
config.coordinate_wgs84 = 4326;    // WGS84

config.realtime_next_stops_limit = 10;
config.realtime_bus_timeout_minutes = 2;

config.realtimebus_timetable_time_horizon = 43200;

config.vdv_import_running = false;

config.vdv_import_username = process.env.VDV_IMPORT_USERNAME;
config.vdv_import_password = process.env.VDV_IMPORT_PASSWORD;

config.firebase_messaging_key_sasabz = "AIzaSyACszhb6MXN1vTfPaT7WB1hkZVRgKyQRh8";
config.firebase_messaging_key_sasabus = "AIzaSyC-vxbzitN6FF0tMZOG6E3RWU9GBShk3sg";

config.lang_default = "en";

module.exports = config;
