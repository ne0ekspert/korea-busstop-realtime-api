// Why use this API name???
'use server';

import axios from 'axios';
import { LRUCache } from 'lru-cache';


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
  const cache = new LRUCache({
    max: 100, // Maximum number of items in cache
    ttl: 30 * 1000, // 30 seconds TTL
  });

  const cacheKey = `stopID-${stopID}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as getEstimatedBusTimeResponse;
  }

  // Fetch data if not in cache
  const request = await axios.get(
    'http://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList',
    {
      params: {
        serviceKey: process.env.DATAGOKR_KEY,
        nodeId: stopID,
        cityCode: cityID,
        numOfRows: 30,
        _type: 'json',
      },
    }
  );

  const data: getEstimatedBusTimeResponse = request.data;

  if (data.response.body.items.item) {
    // Filter items to keep only the lowest arrtime for each routeid
    const filteredItems = Object.values(
      data.response.body.items.item.reduce((acc, curr) => {
        if (!acc[curr.routeid] || acc[curr.routeid].arrtime > curr.arrtime) {
          acc[curr.routeid] = curr;
        }
        return acc;
      }, {} as Record<string, estimatedBusTimeItem>)
    );
  
    // Update the response with the filtered items
    data.response.body.items.item = filteredItems;
  } else {
    data.response.body.items = { item: [] };
  }

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

interface weatherForecastItem {
  regId: string;
  rnSt5Am: number
}

interface getWeatherForecastResponse {
  response: {
    header: {
      resultCode: `${number}`;
      resultMsg: string;
    },
    body: {
      dataType: string,
      items: {
        item: weatherForecastItem[]
      }
    }
  }
}

export async function getWeatherForecast(lat: number, long: number): Promise<getWeatherForecastResponse> {
  const cache = new LRUCache({
    max: 50,
    ttl: 60 * 60 * 1000, // 1 hour TTL
  });

  const now = new Date();
  let hour = now.getHours();
  if (now.getMinutes() < 10) hour--;

  const paddedHours = `${hour}`.padStart(2, '0')+'00';
  const cacheKey = `forecast-${paddedHours}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as getWeatherForecastResponse;
  }

  const request = await axios.get(
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
    {
      params: {
        serviceKey: process.env.DATAGOKR_KEY,
        nx: lat,
        ny: long
      }
    }
  );

  const data: getWeatherForecastResponse = request.data;

  cache.set(cacheKey, data);

  return data;
}