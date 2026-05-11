import { useState, lazy, Suspense } from 'react';
import { canvas, ink } from './cbam/theme.js';
import { Header } from './cbam/Header.jsx';

const ClientView = lazy(() =>
  import('./cbam/ClientView.jsx').then((m) => ({ default: m.ClientView })),
);
const RMView = lazy(() =>
  import('./cbam/RMView.jsx').then((m) => ({ default: m.RMView })),
);

export default function App() {
  const [role, setRole] = useState('client');

  return (
    <div style={{ backgroundColor: canvas, minHeight: '100vh' }}>
      <Header role={role} setRole={setRole} />
      <Suspense fallback={<RouteFallback />}>
        {role === 'client' ? <ClientView /> : <RMView />}
      </Suspense>
    </div>
  );
}

function RouteFallback() {
  return (
    <div
      className="px-8 py-12"
      style={{
        backgroundColor: canvas,
        minHeight: 'calc(100vh - 56px)',
        color: ink[3],
        fontSize: '12px',
      }}
    >
      Loading…
    </div>
  );
}
