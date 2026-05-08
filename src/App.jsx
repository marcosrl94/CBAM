import { useState } from 'react';
import { colors } from './cbam/theme.js';
import { Header } from './cbam/Header.jsx';
import { ClientView } from './cbam/ClientView.jsx';
import { RMView } from './cbam/RMView.jsx';

export default function App() {
  const [role, setRole] = useState('client');

  return (
    <div style={{ backgroundColor: colors.paper, minHeight: '100vh', fontFamily: 'Söhne, ui-sans-serif, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=Inter+Tight:wght@400;500;600&display=swap');
        body { font-family: 'Inter Tight', ui-sans-serif, sans-serif; }
        h1, h2, h3 { font-family: 'Source Serif 4', Georgia, serif; }
      `}</style>
      <Header role={role} setRole={setRole} />
      {role === 'client' ? <ClientView /> : <RMView />}
    </div>
  );
}
