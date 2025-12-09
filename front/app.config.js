export default ({ config }) => {
  // Domyślny URL API (hardcoded jako fallback)
  const defaultApiUrl = 'http://193.106.130.55:5162/api';
  
  // Pobierz URL z zmiennej środowiskowej lub użyj domyślnego
  const apiBaseUrl = process.env.API_BASE_URL || defaultApiUrl;
  
  console.log('📱 Building with API URL:', apiBaseUrl);
  
  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl: apiBaseUrl,
      eas: config.extra?.eas,
    },
  };
};
