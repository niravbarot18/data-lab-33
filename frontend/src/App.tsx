import { AppLayout } from './layouts/AppLayout';
import { ForecastDashboard } from './pages/ForecastDashboard';

export function App() {
  return (
    <AppLayout>
      <ForecastDashboard />
    </AppLayout>
  );
}

export default App;
