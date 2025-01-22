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
  baseDate: `${number}`;
  baseTime: "0200" | "0500" | "0800" | "1100" | "1400" | "1700" | "2000" | "2300";
  category: "POP" | "PTY" | "PCP" | "REH" | "SNO" | "SKY" | "TMP" | "TMN" | "TMX" | "UUU" | "VVV" | "WAV";
  fcstDate: `${number}`;
  fcstTIme: "0000" | "0100" | "0200" | "0300" | "0400" | "0500" | "0600" | "0700" | "0800" | "0900" | "1000" | "1100" | "1200" | "1300" | "1400" | "1500" | "1600" | "1700" | "1800" | "1900" | "2000" | "2100" | "2200" | "2300";
  fcstValue: string;
  nx: number;
  ny: number;
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

export interface getWeatherForecastResult {
  [date: string]: {
    [category: string]: string
  }
}

export async function getWeatherForecast(lat: number, long: number): Promise<getWeatherForecastResult> {
  const cache = new LRUCache({
    max: 50,
    ttl: 60 * 60 * 1000, // 1 hour TTL
  });

  lat = Math.round(lat);
  long = Math.round(long);

  const now = new Date();
  let hour = now.getHours();
  if (now.getMinutes() < 10) hour--;
  const availableDataHours = [
    2, 5, 8, 11, 14, 17, 20, 23
  ].filter((v) => v - hour <= 0);
  hour = Math.max(...availableDataHours);
  const padHour = hour.toString().padStart(2,'0');
  const padMonth = (now.getMonth()+1).toString().padStart(2, '0');
  const padDate = now.getDate().toString().padStart(2, '0');

  const baseDate = `${now.getFullYear()}${padMonth}${padDate}`;
  const baseTime = `${padHour}00`;
  const cacheKey = `forecast-${baseDate}-${baseTime}`;

  //if (cache.has(cacheKey)) {
  //  return cache.get(cacheKey) as getWeatherForecastResult;
  //}

  console.log('baseDate:', baseDate);
  console.log('baseTime:', baseTime);

  const request = await axios.get(
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
    {
      params: {
        serviceKey: process.env.DATAGOKR_KEY,
        nx: lat,
        ny: long,
        base_date: baseDate,
        base_time: baseTime,
        pageNo: 1,
        numOfRows: 1000,
        dataType: 'JSON'
      }
    }
  );

  const data: getWeatherForecastResponse = request.data;
  
  console.log(data);
  const result: getWeatherForecastResult = {};
  for (const item of data.response.body.items.item) {
    if (!result.hasOwnProperty(item.fcstDate)) {
      result[item.fcstDate] = {
        [item.category]: item.fcstValue
      };
    } else {
      result[item.fcstDate][item.category] = item.fcstValue;
    }
  }

  cache.set(cacheKey, result);

  return result;
}