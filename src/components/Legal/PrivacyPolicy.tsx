
interface PrivacyPolicyProps {
  lang: string;
  onClose: () => void;
}

export const PrivacyPolicy = ({ lang, onClose }: PrivacyPolicyProps) => {
  // Определяем локаль для даты
  const dateLocale = lang === 'fi' ? 'fi-FI' : lang === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--bg-color)',
      zIndex: 1000,
      padding: '20px',
      overflowY: 'auto',
      color: 'var(--text-main)'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={onClose}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--card-bg)',
            color: 'var(--text-main)',
            marginBottom: '20px',
            cursor: 'pointer'
          }}
        >
          {lang === 'fi' ? '← Takaisin' : lang === 'ru' ? '← Назад' : '← Back'}
        </button>

        <p style={{ opacity: 0.6, fontSize: '12px' }}>
          {lang === 'fi' ? 'Päivitetty' : lang === 'ru' ? 'Обновлено' : 'Updated'}: {new Date().toLocaleDateString(dateLocale)}
        </p>

        {lang === 'fi' && (
          <section>
            <h1>Tietosuojaseloste (GDPR)</h1>
            <h3>1. Mitä tietoja keräämme?</h3>
            <p>Keräämme vain välttämättömät tiedot: Sähköpostiosoite, nimi ja pistehistoria.</p>
            <h3>2. Mihin käytämme tietoja?</h3>
            <p>Tietoja käytetään vain sovelluksen sisällä lapsen edistymisen seurantaan. Emme luovuta tietoja eteenpäin.</p>
            <h3>3. Tietojen säilytys</h3>
            <p>Tiedot tallennetaan turvallisesti Google Firebase -palveluun.</p>
            <h3>4. Sinun oikeutesi</h3>
            <p>Sinulla on oikeus korjata tai poistaa tietosi milloin tahansa.</p>
          </section>
        )}

        {lang === 'ru' && (
          <section>
            <h1>Политика конфиденциальности (GDPR)</h1>
            <h3>1. Какие данные мы собираем?</h3>
            <p>Мы собираем только Email, имя и историю баллов.</p>
            <h3>2. Как мы используем данные?</h3>
            <p>Данные используются только для отслеживания прогресса внутри приложения. Мы не передаем их третьим лицам.</p>
            <h3>3. Где хранятся данные?</h3>
            <p>Данные надежно хранятся в Google Firebase.</p>
            <h3>4. Ваши права</h3>
            <p>Вы имеете право изменить или удалить свои данные в любой момент.</p>
          </section>
        )}

        {lang === 'en' && (
          <section>
            <h1>Privacy Policy (GDPR)</h1>
            <h3>1. What data do we collect?</h3>
            <p>We collect only essential data: Email, name, and points history.</p>
            <h3>2. How do we use the data?</h3>
            <p>The data is used solely for tracking progress within the app. We do not share it with third parties.</p>
            <h3>3. Data Storage</h3>
            <p>Data is securely stored in Google Firebase.</p>
            <h3>4. Your Rights</h3>
            <p>You have the right to access, correct, or delete your data at any time.</p>
          </section>
        )}

        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          background: 'var(--card-bg)', 
          borderRadius: '16px', 
          fontSize: '14px', 
          opacity: 0.8 
        }}>
          {lang === 'fi' && "Yhteystiedot: Ota yhteyttä ylläpitäjään, jos sinulla on kysyttävää."}
          {lang === 'ru' && "Контакты: По вопросам данных свяжитесь с администратором."}
          {lang === 'en' && "Contact: Contact the administrator if you have any questions."}
        </div>
      </div>
    </div>
  );
};