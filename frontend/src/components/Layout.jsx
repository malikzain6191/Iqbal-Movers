import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div>
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
