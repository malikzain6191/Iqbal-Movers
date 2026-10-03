import { useEffect, useState } from 'react';
import * as driverApi from '../api/driverApi';
import * as fleetApi from '../api/fleetApi';
import { fmtDT, money, vehicleLabel } from '../utils/lookups';
import Modal from './Modal';
import DataGrid from './DataGrid';

export default function ResourceItineraryModal({ type, resource, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const request = type === 'vehicle'
      ? fleetApi.getVehicleItinerary(resource.id)
      : driverApi.getDriverItinerary(resource.id);
    request.then((response) => {
      if (active) setData(response.data);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || requestError.message);
    });
    return () => { active = false; };
  }, [resource.id, type]);

  const title = type === 'vehicle'
    ? `${vehicleLabel(resource)} itinerary`
    : `${resource.name} itinerary`;

  function downloadItinerary() {
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const resourceName = type === 'vehicle' ? vehicleLabel(resource) : resource.name;
    const currentTrip = data.current_location.trip;
    const currentPosition = currentTrip
      ? `In transit: ${currentTrip.route_name}`
      : `${data.current_location.city_name || ''} · ${data.current_location.terminal_name || ''}`;
    const rows = [
      ['Resource type', type],
      ['Resource', resourceName],
      ['Registered', data.resource.created_at],
      ['Home terminal', `${data.resource.city_name || ''} · ${data.resource.home_terminal_name || ''}`],
      ['Current location', currentPosition],
      ['Next assignment', data.next_assignment?.route_name || 'None'],
      [],
      ['Schedule', 'Vehicle', 'Driver', 'From city', 'From terminal', 'Departure', 'To city', 'To terminal', 'Arrival', 'Route', 'Distance (km)', 'Duration (min)', 'Status'],
      ...data.itinerary.map((trip) => [
        trip.schedule_number,
        vehicleLabel(trip),
        trip.driver_name,
        trip.departure_city_name,
        trip.departure_terminal_name,
        trip.departure_datetime,
        trip.arrival_city_name,
        trip.arrival_terminal_name,
        trip.arrival_datetime,
        trip.route_name,
        trip.distance_km,
        trip.estimated_duration_minutes,
        trip.is_current ? 'In transit' : trip.is_completed ? 'Completed' : trip.status
      ])
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-itinerary.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal title={title} onClose={onClose} hideFooter>
      {!data && !error && <div className="empty">Loading itinerary…</div>}
      {error && <div className="err" style={{ display: 'block' }}>{error}</div>}
      {data && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button className="btn sm gh" onClick={downloadItinerary}>Download CSV</button>
          </div>
          <div style={{ marginBottom: 14, fontSize: 13 }}>
            <div><b>Registered:</b> {fmtDT(data.resource.created_at)}</div>
            <div><b>Home:</b> {data.resource.home_terminal_city_name || data.resource.city_name || 'Unknown city'} · {data.resource.home_terminal_name || 'No starting terminal'}</div>
            {data.itinerary.some((trip) => trip.has_conflict) && <div className="err" style={{ display: 'block', marginTop: 6 }}>This resource has overlapping trip assignments. Review the flagged rows before planning another trip.</div>}
            {data.current_location.status === 'In transit' ? (
              <div><b>Current:</b> In transit, {data.current_location.trip.route_name}; arriving at {data.current_location.trip.arrival_terminal_name} at {fmtDT(data.current_location.trip.arrival_datetime)}</div>
            ) : (
              <div><b>Current:</b> {data.current_location.terminal_name || 'Unknown terminal'} · {data.current_location.city_name || 'Unknown city'}</div>
            )}
            {data.next_assignment ? (
              <div><b>Next:</b> {data.next_assignment.route_name} · {fmtDT(data.next_assignment.departure_datetime)}</div>
            ) : (
              <div><b>Next:</b> No upcoming trip</div>
            )}
          </div>
          <DataGrid data={data.itinerary} columns={[
            { id: 'vehicle', header: 'Bus', accessorFn: (trip) => vehicleLabel(trip) },
            { accessorKey: 'driver_name', header: 'Driver' },
            { id: 'from', header: 'From', accessorFn: (trip) => `${trip.departure_city_name} · ${trip.departure_terminal_name}` },
            { accessorKey: 'departure_datetime', header: 'Departure', cell: ({ row }) => fmtDT(row.original.departure_datetime) },
            { accessorKey: 'route_name', header: 'Route' },
            { id: 'to', header: 'To', accessorFn: (trip) => `${trip.arrival_city_name} · ${trip.arrival_terminal_name}` },
            { id: 'arrival', header: 'Arrival', accessorFn: (trip) => trip.arrival_datetime, cell: ({ row }) => fmtDT(row.original.arrival_datetime) },
            { id: 'distance', header: 'Distance', accessorFn: (trip) => Number(trip.distance_km || 0), cell: ({ row }) => row.original.distance_km ? `${row.original.distance_km} km` : 'Not set' },
            { id: 'duration', header: 'Duration', accessorFn: (trip) => Number(trip.estimated_duration_minutes || 0), cell: ({ row }) => row.original.estimated_duration_minutes ? `${row.original.estimated_duration_minutes} min` : 'Not set' },
            { id: 'trip_state', header: 'Status', accessorFn: (trip) => trip.has_conflict ? 'Schedule conflict' : trip.is_current ? 'In transit' : trip.is_completed ? 'Completed' : trip.status }
          ]} emptyMessage="No trips recorded." />
          {type === 'vehicle' && <div style={{ marginTop: 12, fontSize: 13 }}><b>Capacity:</b> {data.resource.seating_capacity} seats · <b>Fare:</b> {data.next_assignment ? money(data.next_assignment.fare) : 'Not scheduled'}</div>}
        </>
      )}
    </Modal>
  );
}