'use client';

import dynamic from 'next/dynamic';
import useConfig from '../context/useConfig';

function SelectedStation() {
  const config = useConfig();

  return (
    <div>
      <p>cityID: {config.cityID ?? 'null'}</p>
      <p>stationID: {config.stationID ?? 'null'}</p>
    </div>
  );
}

export default function StationSelector() {
  const MyMap = dynamic(
    () => import("./map"), {
    ssr: false,
    loading: () => (<p>Loading map...</p>)
  });

  return (
    <div>
      <MyMap />
      <div>
        <SelectedStation />
      </div>
    </div>
  );
}