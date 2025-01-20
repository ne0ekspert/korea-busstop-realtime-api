import axios from "axios";
import useConfig from "../context/useConfig";

import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 100, // Maximum number of items in cache
  ttl: 24 * 60 * 60 * 1000, // 1 day TTL
});

type OverpassElement = {
  id: number;
  lat: number;
  lon: number;
  tags: {
    [key: string]: string;
  };
};

export async function requestOverpass(
  name?: string,
  amenity?: string,
  tourism?: string,
  radius = 1000
): Promise<OverpassElement[]> {
  const cacheKey = `overpass-${name}-${amenity}-${tourism}`;

  // Check cache
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as OverpassElement[]; // Return cached data
  }

  const { latitude, longitude } = useConfig.getState();
  const node = `node(around:${radius},${latitude},${longitude})`;
  const area = `area(around:${radius},${latitude},${longitude})`;

  const filters: string[] = [];

  if (name) {
    filters.push(`${node}[name~"${name}"];`);
    filters.push(`${area}[name~"${name}"];`);
  }
  if (amenity) {
    filters.push(`${node}[amenity=${amenity}];`);
    filters.push(`${area}[amenity=${amenity}];`);
  }
  if (tourism) {
    filters.push(`${node}[tourism=${tourism}];`);
    filters.push(`${area}[tourism=${tourism}];`);
  }

  const query = `
    [out:json];
    (
      ${filters.join('')}
    );
    (._;>;);
    out body;
  `;

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Ensure the content type is properly set
        },
      }
    );

    cache.set(cacheKey, response.data.elements);
    return response.data.elements;
  } catch (error) {
    console.error('Error fetching data from Overpass API:', error);
    return [];
  }
}