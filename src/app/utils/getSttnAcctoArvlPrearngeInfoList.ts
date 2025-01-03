// Why use this API name???
'use server';

import axios from 'axios';
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 100, // Maximum number of items in cache
  ttl: 30 * 1000, // 30 seconds TTL
});

export interface estimatedBusTimeItem {
  arrprevstationcnt: number;
  arrtime: number;
  nodeid: string;
  nodenm: string;
  routeid: string;
  routeno: string;
  routetp: string;
  vehicletp: string;
}

interface getEstimatedBusTimeResponse {
  response: {
    body: {
      items: {
        item: estimatedBusTimeItem[]
      }
    },
    header: {
      resultCode: `${number}`;
      resultMsg: string;
    }
  }
}

export async function getEstimatedBusTime(cityID: string, stopID: string): Promise<getEstimatedBusTimeResponse> {
  const cacheKey = `stopID-${stopID}`;

  // Check cache
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as getEstimatedBusTimeResponse; // Return cached data
  }

  // Fetch data if not in cache
  const request = await axios.get(
    'http://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList',
    {
      params: {
        serviceKey: process.env.DATAGOKR_KEY,
        nodeId: stopID,
        cityCode: cityID,
        _type: 'json',
      },
    }
  );

  let data: getEstimatedBusTimeResponse= request.data;

  // Store in cache
  cache.set(cacheKey, data);

  return data;
}

export interface nearStationsItem {
  citycode: number;
  gpslati: number;
  gpslong: number;
  nodeid: string;
  nodenm: string;
};

interface getNearStationsResponse {
  response: {
    header: {
      resultCode: `${number}`;
      resultMsg: string;
    },
    body: {
      items: {
        item: nearStationsItem[];
      }
    }
  }
}

export async function getNearStations(lat: number, long: number): Promise<getNearStationsResponse> {
  const request = await axios.get(
    'http://apis.data.go.kr/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList',
    {
      params: {
        serviceKey: process.env.DATAGOKR_KEY,
        gpsLati: lat,
        gpsLong: long,
        _type: 'json'
      }
    }
  );

  const data = request.data;

  return data;
}