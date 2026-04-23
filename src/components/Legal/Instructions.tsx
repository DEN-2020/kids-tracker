import type { TranslationContent } from '../../translations';

export const Instructions = ({ t, lang, onClose }: { t: TranslationContent; lang: string; onClose: () => void }) => {
  
  // Создаем массив шагов с учетом новой логики баллов и XP
  const steps = [
    { 
      icon: '📝', 
      title: t.howItWorks.step1.t, 
      desc: t.howItWorks.step1.d 
    },
    { 
      icon: '📱', 
      title: t.howItWorks.step2.t, 
      desc: t.howItWorks.step2.d 
    },
    { 
      icon: '💎', 
      title: lang === 'fi' ? 'XP ja Tasot' : 'XP и Уровни', 
      desc: lang === 'fi' 
        ? 'XP on kokemuksesi. Se kasvaa aina eikä koskaan häviä! Kerää XP:tä nostaaksesi tasoa.' 
        : 'XP — это твой опыт. Он растет всегда и не исчезает! Копи XP, чтобы повышать уровень.' 
    },
    { 
      icon: '🎁', 
      title: lang === 'fi' ? 'Kauppa ja Kolikot' : 'Магазин и Монеты', 
      desc: lang === 'fi' 
        ? 'Käytä 💰 ostaaksesi palkintoja kaupasta. Kun ostat jotain, kolikot vähenevät, mutta XP pysyy!' 
        : 'Трать 💰 на призы в магазине. При покупке монеты спишутся, но твой опыт (XP) останется!' 
    },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bg-color)', zIndex: 1100, padding: '20px', overflowY: 'auto',
      color: 'var(--text-main)'
    }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <button onClick={onClose} style={{
          padding: '10px 20px', borderRadius: '12px', border: 'none',
          background: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer',
          fontSize: '18px'
        }}>
          ✕
        </button>

        <h2 style={{ textAlign: 'center', margin: '30px 0', color: 'var(--accent-blue)' }}>
          {t.howItWorks.title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: '15px', padding: '20px',
              background: 'var(--card-bg)', borderRadius: '20px',
              alignItems: 'center', border: '1px solid var(--border-color)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: '40px' }}>{step.icon}</span>
              <div>
                <strong style={{ display: 'block', fontSize: '17px', marginBottom: '4px', color: 'white' }}>
                  {step.title}
                </strong>
                <span style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
                  {step.desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          width: '100%', marginTop: '30px', padding: '18px',
          background: 'var(--accent-green)', color: 'white',
          border: 'none', borderRadius: '20px', fontWeight: 'bold',
          cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}>
          {lang === 'fi' ? 'SELVÄ! 🚀' : lang === 'ru' ? 'ПОЕХАЛИ! 🚀' : "LET'S GO! 🚀"}
        </button>
      </div>
    </div>
  );
};