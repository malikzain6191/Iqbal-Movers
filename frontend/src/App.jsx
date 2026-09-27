import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LookupsProvider } from './context/LookupsContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LookupsProvider>
          <AppRoutes />
        </LookupsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
