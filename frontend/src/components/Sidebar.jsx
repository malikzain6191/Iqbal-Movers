import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import { NAV_ITEMS } from '../routes/AppRoutes';
import { cityName, termName } from '../utils/lookups';

const ROLE_LABEL = { super_admin: 'Super Admin', city_admin: 'City Admin', counter_operator: 'Counter Operator' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { cities, terminals } = useLookups();
  const accessLocation = user.role === 'super_admin'
    ? 'All cities'
    : user.role === 'counter_operator'
      ? `${cityName(user.city_id, cities)} · ${termName(user.terminal_id, terminals)}`
      : `${cityName(user.city_id, cities)} · All city terminals`;
  return (
    <div className="side">
      <div className="brand">
        🚌 Iqbal Travels
        <span>Transportation Mgmt System</span>
      </div>
      <div className="nav">
        {NAV_ITEMS.filter((n) => n.roles.includes(user.role)).map((n) => (
          <NavLink key={n.path} to={n.path} className={({ isActive }) => (isActive ? 'on' : '')}>
            {n.label}
          </NavLink>
        ))}
      </div>
      <div className="userbox">
        <b>{user.name}</b>
        {ROLE_LABEL[user.role]}
        <small>{accessLocation}</small>
        <button onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
