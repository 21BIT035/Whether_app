import { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Input, Button, Typography, Tag, Spin, Skeleton,
  Tooltip, Divider, Switch
} from 'antd';
import {
  WiThermometer, WiHumidity, WiBarometer, WiStrongWind,
  WiDaySunny, WiCloud, WiRain, WiSnow, WiThunderstorm,
  WiFog, WiSunrise, WiSunset, WiDayCloudy, WiNightClear,
  WiNightCloudy, WiDayRain, WiNightRain, WiDaySnow,
  WiNightSnow, WiDayThunderstorm, WiNightThunderstorm,
  WiDayFog, WiNightFog, WiDayHaze, WiDust, WiTornado,
  WiCloudy, WiDayShowers, WiNightShowers, WiNightAltCloudy
} from 'react-icons/wi';
import {
  FaSearch, FaEye, FaCloud, FaWind, FaSmog
} from 'react-icons/fa';
import {
  IoIosArrowUp, IoIosArrowDown
} from 'react-icons/io';
import {
  MdAir
} from 'react-icons/md';
import axios from 'axios';
import './Weather.css';

const { Title, Text, Paragraph } = Typography;

const API_KEY = "cdc5c10464b1516d10e4f9c9b4779022";

const formatTime = (timestamp, timezoneOffset) => {
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
};

const formatDate = (timestamp, timezoneOffset) => {
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const getCurrentDateTime = (timezoneOffset) => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cityTime = new Date(utc + timezoneOffset * 1000);
  return {
    date: cityTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: cityTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  };
};

const getWeatherIcon = (iconCode, size = 80) => {
  const iconMap = {
    '01d': <WiDaySunny size={size} />,
    '01n': <WiNightClear size={size} />,
    '02d': <WiDayCloudy size={size} />,
    '02n': <WiNightAltCloudy size={size} />,
    '03d': <WiCloud size={size} />,
    '03n': <WiCloudy size={size} />,
    '04d': <WiCloudy size={size} />,
    '04n': <WiCloudy size={size} />,
    '09d': <WiDayShowers size={size} />,
    '09n': <WiNightShowers size={size} />,
    '10d': <WiDayRain size={size} />,
    '10n': <WiNightRain size={size} />,
    '11d': <WiDayThunderstorm size={size} />,
    '11n': <WiNightThunderstorm size={size} />,
    '13d': <WiDaySnow size={size} />,
    '13n': <WiNightSnow size={size} />,
    '50d': <WiDayFog size={size} />,
    '50n': <WiNightFog size={size} />,
  };
  return iconMap[iconCode] || <WiDaySunny size={size} />;
};

const getWeatherBackground = (weatherId) => {
  if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
  if (weatherId >= 300 && weatherId < 400) return 'rain';
  if (weatherId >= 500 && weatherId < 600) return 'rain';
  if (weatherId >= 600 && weatherId < 700) return 'snow';
  if (weatherId >= 700 && weatherId < 800) return 'mist';
  if (weatherId === 800) return 'clear';
  if (weatherId > 800) return 'clouds';
  return 'clear';
};

const getAQIColor = (aqi) => {
  const colors = ['#00e400', '#ffff00', '#ff7e00', '#ff0000', '#8f3f97', '#7e0023'];
  const labels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor', 'Hazardous'];
  const index = Math.min(aqi - 1, 5);
  return { color: colors[Math.max(0, index)], label: labels[Math.max(0, index)] };
};

const getAQIGradient = (aqi) => {
  if (aqi === 1) return 'linear-gradient(135deg, #00e400 0%, #00c400 100%)';
  if (aqi === 2) return 'linear-gradient(135deg, #ffff00 0%, #e6d800 100%)';
  if (aqi === 3) return 'linear-gradient(135deg, #ff7e00 0%, #e66e00 100%)';
  if (aqi === 4) return 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)';
  if (aqi === 5) return 'linear-gradient(135deg, #8f3f97 0%, #7a2f82 100%)';
  return 'linear-gradient(135deg, #7e0023 0%, #66001a 100%)';
};

const getWindDirection = (deg) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
};

const getDailyForecast = (forecastData) => {
  const dailyMap = {};
  forecastData.list.forEach((item) => {
    const date = item.dt_txt.split(' ')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { temps: [], humidity: [], icon: null, dt: item.dt, weather: null };
    }
    dailyMap[date].temps.push(item.main.temp);
    dailyMap[date].humidity.push(item.main.humidity);
    if (!dailyMap[date].icon && item.dt_txt.includes('12:00:00')) {
      dailyMap[date].icon = item.weather[0].icon;
      dailyMap[date].weather = item.weather[0];
    }
  });

  return Object.entries(dailyMap)
    .slice(1, 6)
    .map(([date, data]) => ({
      date,
      dt: data.dt,
      minTemp: Math.round(Math.min(...data.temps)),
      maxTemp: Math.round(Math.max(...data.temps)),
      humidity: Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length),
      icon: data.icon || '01d',
      weather: data.weather
    }));
};

const Weather = () => {
  const [city, setCity] = useState('London');
  const [searchInput, setSearchInput] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [weatherBg, setWeatherBg] = useState('clear');
  const [currentTime, setCurrentTime] = useState({ date: '', time: '' });

  const fetchWeatherData = useCallback(async (cityName) => {
    if (!cityName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=metric`),
        axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${API_KEY}&units=metric`)
      ]);

      const { lat, lon } = weatherRes.data.coord;
      const aqiRes = await axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);

      setWeatherData(weatherRes.data);
      setForecastData(forecastRes.data);
      setAqiData(aqiRes.data);
      setWeatherBg(getWeatherBackground(weatherRes.data.weather[0].id));
      setCity(weatherRes.data.name);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError({ type: 'city', message: `City "${cityName}" not found. Please check the spelling and try again.` });
      } else if (err.message === 'Network Error') {
        setError({ type: 'network', message: 'Unable to connect. Please check your internet connection and try again.' });
      } else {
        setError({ type: 'api', message: 'Something went wrong. Please try again later.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeatherData(city);
  }, [fetchWeatherData]);

  useEffect(() => {
    if (!weatherData) return;
    const updateClock = () => {
      setCurrentTime(getCurrentDateTime(weatherData.timezone));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [weatherData]);

  const handleSearch = () => {
    if (searchInput.trim()) {
      fetchWeatherData(searchInput.trim());
      setSearchInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  const dailyForecast = forecastData ? getDailyForecast(forecastData) : [];

  return (
    <div className={`weather-app ${darkMode ? 'dark' : 'light'} weather-bg-${weatherBg}`}>
      {weatherBg === 'rain' && <div className="rain-container">{Array.from({ length: 60 }).map((_, i) => <div key={i} className="raindrop" />)}</div>}
      {weatherBg === 'snow' && <div className="snow-container">{Array.from({ length: 40 }).map((_, i) => <div key={i} className="snowflake" />)}</div>}
      {weatherBg === 'thunderstorm' && <div className="lightning-overlay" />}
      {(weatherBg === 'clouds' || weatherBg === 'mist') && (
        <div className="clouds-container">
          <div className="floating-cloud cloud-1" />
          <div className="floating-cloud cloud-2" />
          <div className="floating-cloud cloud-3" />
        </div>
      )}
      {weatherBg === 'clear' && <div className="sun-glow" />}

      <div className="weather-content">
        {/* Header */}
        <header className="weather-header slide-up">
          <div className="header-left">
            <div className="app-logo">
              <WiDaySunny size={32} className="logo-icon" />
              <Title level={4} className="app-name">WeatherScope</Title>
            </div>
            {weatherData && (
              <Text className="header-datetime">
                {currentTime.date} &middot; {currentTime.time}
              </Text>
            )}
          </div>
          <div className="header-right">
            <div className="search-wrapper">
              <Input
                placeholder="Search city..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleKeyPress}
                className="search-input"
                prefix={<FaSearch className="search-icon-input" />}
              />
              <Button type="primary" onClick={handleSearch} className="search-btn">Search</Button>
            </div>
            <div className="theme-toggle">
              <WiDaySunny size={18} />
              <Switch
                checked={darkMode}
                onChange={toggleTheme}
                className="theme-switch"
              />
              <WiNightClear size={18} />
            </div>
          </div>
        </header>

        {error && (
          <div className="error-card fade-in">
            <Card className="glass-card error-glass">
              <div className="error-content">
                {error.type === 'city' && <WiDayHaze size={60} />}
                {error.type === 'network' && <FaSmog size={50} />}
                {error.type === 'api' && <WiTornado size={60} />}
                <Title level={4} className="error-title">
                  {error.type === 'city' ? 'City Not Found' : error.type === 'network' ? 'Network Error' : 'API Error'}
                </Title>
                <Paragraph className="error-message">{error.message}</Paragraph>
                <Button type="primary" onClick={() => fetchWeatherData(city)} className="retry-btn">
                  Retry
                </Button>
              </div>
            </Card>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <Card className="glass-card" style={{ width: '100%' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <Col xs={24} sm={12} md={6} key={i}>
                  <Card className="glass-card">
                    <Skeleton active paragraph={{ rows: 2 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {!loading && !error && weatherData && (
          <>
            {/* Weather Overview Card */}
            <div className="overview-section fade-in">
              <Card className="glass-card overview-card">
                <div className="overview-content">
                  <div className="overview-left">
                    <div className="city-info">
                      <Title level={2} className="city-name">{weatherData.name}</Title>
                      <Text className="country-name">{weatherData.sys.country}</Text>
                    </div>
                    <div className="temp-display">
                      <Text className="temperature">{Math.round(weatherData.main.temp)}&deg;</Text>
                      <Text className="temp-unit">C</Text>
                    </div>
                    <div className="weather-status">
                      <Text className="status-text">{weatherData.weather[0].description}</Text>
                      <Tag color="rgba(255,255,255,0.15)" className="feels-like-tag">
                        <WiThermometer size={16} style={{ marginRight: 4 }} />
                        Feels like {Math.round(weatherData.main.feels_like)}&deg;C
                      </Tag>
                    </div>
                    <Text className="last-updated">
                      Last updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                  <div className="overview-right">
                    <div className="weather-icon-large float-animation">
                      {getWeatherIcon(weatherData.weather[0].icon, 140)}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Weather Details */}
            <div className="details-section fade-in" style={{ animationDelay: '0.1s' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <WiHumidity size={36} className="detail-icon humidity-icon" />
                      <div>
                        <Text className="detail-label">Humidity</Text>
                        <Text className="detail-value">{weatherData.main.humidity}%</Text>
                      </div>
                    </div>
                    <div className="detail-bar">
                      <div className="detail-bar-fill humidity-bar" style={{ width: `${weatherData.main.humidity}%` }} />
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <WiBarometer size={36} className="detail-icon pressure-icon" />
                      <div>
                        <Text className="detail-label">Pressure</Text>
                        <Text className="detail-value">{weatherData.main.pressure} hPa</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <WiStrongWind size={36} className="detail-icon wind-icon" />
                      <div>
                        <Text className="detail-label">Wind Speed</Text>
                        <Text className="detail-value">{weatherData.wind.speed} m/s</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <FaWind size={28} className="detail-icon direction-icon" />
                      <div>
                        <Text className="detail-label">Wind Direction</Text>
                        <Text className="detail-value">{getWindDirection(weatherData.wind.deg)} ({weatherData.wind.deg}&deg;)</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <FaEye size={28} className="detail-icon visibility-icon" />
                      <div>
                        <Text className="detail-label">Visibility</Text>
                        <Text className="detail-value">{(weatherData.visibility / 1000).toFixed(1)} km</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <FaCloud size={28} className="detail-icon cloud-icon" />
                      <div>
                        <Text className="detail-label">Cloud Coverage</Text>
                        <Text className="detail-value">{weatherData.clouds.all}%</Text>
                      </div>
                    </div>
                    <div className="detail-bar">
                      <div className="detail-bar-fill cloud-bar" style={{ width: `${weatherData.clouds.all}%` }} />
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Tooltip title="Sunrise time in local timezone">
                    <Card className="glass-card detail-card">
                      <div className="detail-item">
                        <WiSunrise size={36} className="detail-icon sunrise-icon" />
                        <div>
                          <Text className="detail-label">Sunrise</Text>
                          <Text className="detail-value">{formatTime(weatherData.sys.sunrise, weatherData.timezone)}</Text>
                        </div>
                      </div>
                    </Card>
                  </Tooltip>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Tooltip title="Sunset time in local timezone">
                    <Card className="glass-card detail-card">
                      <div className="detail-item">
                        <WiSunset size={36} className="detail-icon sunset-icon" />
                        <div>
                          <Text className="detail-label">Sunset</Text>
                          <Text className="detail-value">{formatTime(weatherData.sys.sunset, weatherData.timezone)}</Text>
                        </div>
                      </div>
                    </Card>
                  </Tooltip>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card className="glass-card detail-card">
                    <div className="detail-item">
                      <WiThermometer size={36} className="detail-icon temp-range-icon" />
                      <div>
                        <Text className="detail-label">Temp Range</Text>
                        <div className="temp-range">
                          <IoIosArrowDown className="arrow-down" />
                          <Text className="detail-value">{Math.round(weatherData.main.temp_min)}&deg;</Text>
                          <IoIosArrowUp className="arrow-up" />
                          <Text className="detail-value">{Math.round(weatherData.main.temp_max)}&deg;</Text>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* 5-Day Forecast */}
            <div className="forecast-section fade-in" style={{ animationDelay: '0.2s' }}>
              <Divider className="section-divider">
                <Title level={4} className="section-title">5-Day Forecast</Title>
              </Divider>
              <div className="forecast-scroll">
                <Row gutter={[16, 16]} className="forecast-row">
                  {dailyForecast.map((day, index) => (
                    <Col xs={12} sm={8} md={4} lg={4} key={day.date}>
                      <Card className={`glass-card forecast-card pulse-animation`} style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="forecast-content">
                          <Text className="forecast-day">{formatDate(day.dt, weatherData.timezone).split(',')[0]}</Text>
                          <Text className="forecast-date">{formatDate(day.dt, weatherData.timezone).split(',')[1]?.trim()}</Text>
                          <div className="forecast-icon">
                            {getWeatherIcon(day.icon, 50)}
                          </div>
                          <div className="forecast-temps">
                            <span className="forecast-max">{day.maxTemp}&deg;</span>
                            <span className="forecast-min">{day.minTemp}&deg;</span>
                          </div>
                          <div className="forecast-humidity">
                            <WiHumidity size={16} />
                            <Text>{day.humidity}%</Text>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </div>

            {/* Air Quality */}
            {aqiData && aqiData.list && aqiData.list[0] && (
              <div className="aqi-section fade-in" style={{ animationDelay: '0.3s' }}>
                <Divider className="section-divider">
                  <Title level={4} className="section-title">Air Quality Index</Title>
                </Divider>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Card className="glass-card aqi-main-card" style={{ background: getAQIGradient(aqiData.list[0].main.aqi) }}>
                      <div className="aqi-main-content">
                        <MdAir size={40} className="aqi-main-icon" />
                        <Title level={1} className="aqi-value">{aqiData.list[0].main.aqi}</Title>
                        <Tag className="aqi-badge" style={{ background: getAQIColor(aqiData.list[0].main.aqi).color, color: '#000' }}>
                          {getAQIColor(aqiData.list[0].main.aqi).label}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={16}>
                    <Row gutter={[12, 12]}>
                      {[
                        { label: 'PM2.5', value: aqiData.list[0].components.pm2_5, icon: <FaSmog size={20} />, key: 'pm25' },
                        { label: 'PM10', value: aqiData.list[0].components.pm10, icon: <WiDust size={28} />, key: 'pm10' },
                        { label: 'CO', value: aqiData.list[0].components.co, icon: <FaSmog size={20} />, key: 'co' },
                        { label: 'NO2', value: aqiData.list[0].components.no2, icon: <FaWind size={20} />, key: 'no2' },
                        { label: 'O3', value: aqiData.list[0].components.o3, icon: <WiDaySunny size={28} />, key: 'o3' },
                        { label: 'SO2', value: aqiData.list[0].components.so2, icon: <MdAir size={22} />, key: 'so2' },
                      ].map((item) => (
                        <Col xs={12} sm={8} key={item.key}>
                          <Card className="glass-card aqi-component-card">
                            <div className="aqi-component">
                              <div className="aqi-comp-icon">{item.icon}</div>
                              <Text className="aqi-comp-label">{item.label}</Text>
                              <Text className="aqi-comp-value">{typeof item.value === 'number' ? item.value.toFixed(1) : item.value}</Text>
                              <Text className="aqi-comp-unit">µg/m³</Text>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>
              </div>
            )}

            {/* Footer */}
            <footer className="weather-footer fade-in" style={{ animationDelay: '0.4s' }}>
              <Text className="footer-text">Powered by OpenWeatherMap</Text>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default Weather;
