'use client';

import { memo, useEffect, useState } from "react";
import type React from "react";
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { getNearStations, nearStationsItem } from "../utils/getSttnAcctoArvlPrearngeInfoList";
import useConfig from "../context/useConfig";

const BusStationMarkers = () => {
  const map = useMap();
  const config = useConfig();

  const [ stations, setStations ] = useState<nearStationsItem[]>([]);

  useEffect(() => {
    if (map) {
      const dragEventListener = async () => {
        const { lat, lng } = map.getCenter();
        console.log(lat, lng);

        const apiResponse = await getNearStations(lat, lng);

        const results = apiResponse.response.body.items.item;
        console.log(results);
        setStations(results ?? []);
      };

      map.on('dragend', dragEventListener);

      return () => {
        map.off('dragend', dragEventListener);
      }
    }
  }, [map]);

  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.nodeid}
          position={[station.gpslati, station.gpslong]}
          icon={L.divIcon({
            iconSize: [128, 32],
            iconAnchor: [32 / 2, 32 + 9],
            html: `🚌 ${station.nodeid} | ${station.nodenm}`,
            className: 'text-black bg-white',
          })}
          eventHandlers={{
            click: () => {
              console.log('Marker clicked', station.citycode, station.nodeid);
              config.setCityID(station.citycode.toString());
              config.setStationID(station.nodeid);
            }
          }}
          title={`${station.nodeid} | ${station.nodenm}`}
          riseOnHover
        >
        </Marker>
      ))}
    </>
  );
}

const Map = memo(() => (
  <MapContainer
    center={[38, 128]}
    zoom={10}
    scrollWheelZoom={true}
    style={{ width: "100%", height: "550px" }}
  >
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <BusStationMarkers />
  </MapContainer>
));

Map.displayName = "Map";

export default Map;