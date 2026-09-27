import { createContext, useContext, useEffect, useState } from 'react';
import * as cityApi from '../api/cityApi';
import * as driverApi from '../api/driverApi';
import * as fleetApi from '../api/fleetApi';
import * as routeApi from '../api/routeApi';
import { useAuth } from './AuthContext';

const LookupsContext = createContext(null);

export function LookupsProvider({ children }) {
  const { user } = useAuth();
  const [lookups, setLookups] = useState({ cities: [], terminals: [], vehicles: [], drivers: [], routes: [] });

  async function refreshLookups() {
    if (!user) {
      setLookups({ cities: [], terminals: [], vehicles: [], drivers: [], routes: [] });
      return;
    }

    const results = await Promise.allSettled([
      cityApi.listCities(),
      cityApi.listTerminals(),
      fleetApi.listVehicles(),
      driverApi.listDrivers(),
      routeApi.listRoutes()
    ]);
    setLookups((current) => ({
      cities: results[0].status === 'fulfilled' ? results[0].value.data : current.cities,
      terminals: results[1].status === 'fulfilled' ? results[1].value.data : current.terminals,
      vehicles: results[2].status === 'fulfilled' ? results[2].value.data : current.vehicles,
      drivers: results[3].status === 'fulfilled' ? results[3].value.data : current.drivers,
      routes: results[4].status === 'fulfilled' ? results[4].value.data : current.routes
    }));
  }

  useEffect(() => {
    refreshLookups();
  }, [user]);

  return (
    <LookupsContext.Provider value={{ ...lookups, refreshLookups }}>
      {children}
    </LookupsContext.Provider>
  );
}

export const useLookups = () => useContext(LookupsContext);