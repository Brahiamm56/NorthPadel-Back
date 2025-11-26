const axios = require('axios');
const { db } = require('../config/firebase');
const notificationService = require('./notifications.service');

class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.geoUrl = 'https://api.openweathermap.org/geo/1.0';
  }

  // Obtener coordenadas de una ciudad
  async getCoordinates(cityName) {
    try {
      const response = await axios.get(`${this.geoUrl}/direct`, {
        params: {
          q: cityName,
          limit: 1,
          appid: this.apiKey,
        },
      });

      if (response.data.length === 0) {
        throw new Error('Ciudad no encontrada');
      }

      return {
        lat: response.data[0].lat,
        lon: response.data[0].lon,
      };
    } catch (error) {
      console.error('Error obteniendo coordenadas:', error.message);
      throw error;
    }
  }

  // Obtener pronóstico del tiempo para una fecha específica
  async getWeatherForecast(location, date) {
    try {
      const coordinates = await this.getCoordinates(location);
      const targetDate = new Date(date);
      const now = new Date();
      
      // Calcular días desde hoy
      const daysDiff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
      
      // OpenWeatherMap API permite pronóstico hasta 5 días
      if (daysDiff < 0 || daysDiff > 5) {
        throw new Error('El pronóstico solo está disponible para los próximos 5 días');
      }

      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: coordinates.lat,
          lon: coordinates.lon,
          appid: this.apiKey,
          units: 'metric', // Para obtener temperatura en Celsius
          lang: 'es', // Descripciones en español
        },
      });

      // Filtrar pronóstico para la fecha específica
      const forecastData = response.data.list.filter(item => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate.toDateString() === targetDate.toDateString();
      });

      if (forecastData.length === 0) {
        throw new Error('No hay datos de pronóstico para la fecha especificada');
      }

      // Analizar condiciones climáticas adversas
      const adverseConditions = this.checkAdverseConditions(forecastData);

      return {
        location,
        date: targetDate,
        forecast: forecastData,
        adverseConditions,
        hasAdverseWeather: adverseConditions.length > 0,
      };
    } catch (error) {
      console.error('Error obteniendo pronóstico del clima:', error.message);
      throw error;
    }
  }

  // Verificar condiciones climáticas adversas
  checkAdverseConditions(forecastData) {
    const adverseConditions = [];

    forecastData.forEach(item => {
      const { main, weather, wind, rain } = item;

      // Lluvia
      if (rain && rain['3h'] > 2.5) {
        adverseConditions.push({
          type: 'rain',
          description: 'Lluvia intensa',
          severity: 'high',
          details: `Precipitación: ${rain['3h']}mm en 3h`,
        });
      } else if (weather.some(w => w.main.toLowerCase().includes('rain'))) {
        adverseConditions.push({
          type: 'rain',
          description: 'Lluvia',
          severity: 'medium',
          details: weather[0].description,
        });
      }

      // Viento fuerte
      if (wind && wind.speed > 10) { // > 36 km/h
        adverseConditions.push({
          type: 'wind',
          description: 'Viento fuerte',
          severity: 'medium',
          details: `Velocidad: ${wind.speed} m/s`,
        });
      }

      // Temperatura extremas
      if (main) {
        if (main.temp < 5) {
          adverseConditions.push({
            type: 'cold',
            description: 'Temperatura muy baja',
            severity: 'medium',
            details: `Temperatura: ${main.temp}°C`,
          });
        } else if (main.temp > 35) {
          adverseConditions.push({
            type: 'heat',
            description: 'Temperatura muy alta',
            severity: 'high',
            details: `Temperatura: ${main.temp}°C`,
          });
        }
      }

      // Tormentas
      if (weather.some(w => w.main.toLowerCase().includes('thunderstorm'))) {
        adverseConditions.push({
          type: 'storm',
          description: 'Tormenta eléctrica',
          severity: 'high',
          details: weather[0].description,
        });
      }

      // Nieve
      if (weather.some(w => w.main.toLowerCase().includes('snow'))) {
        adverseConditions.push({
          type: 'snow',
          description: 'Nieve',
          severity: 'high',
          details: weather[0].description,
        });
      }
    });

    return adverseConditions;
  }

  // Obtener todas las reservas para mañana
  async getTomorrowReservas() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const reservasSnapshot = await db.collection('reservas')
        .where('fecha', '>=', tomorrow.toISOString().split('T')[0])
        .where('fecha', '<', dayAfter.toISOString().split('T')[0])
        .where('estado', '==', 'confirmada')
        .get();

      return reservasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error obteniendo reservas de mañana:', error);
      throw error;
    }
  }

  // Verificar clima para todas las reservas del día siguiente
  async checkWeatherForReservas() {
    try {
      console.log('🔍 Verificando clima para reservas de mañana...');
      
      const reservas = await this.getTomorrowReservas();
      console.log(`Encontradas ${reservas.length} reservas para mañana`);

      if (reservas.length === 0) {
        return { processed: 0, alerts: 0 };
      }

      let alertsSent = 0;

      for (const reserva of reservas) {
        try {
          // Obtener información del complejo para la ubicación
          const complejoDoc = await db.collection('complejos').doc(reserva.complejoId).get();
          if (!complejoDoc.exists) {
            console.log(`Complejo no encontrado para reserva ${reserva.id}`);
            continue;
          }

          const complejo = complejoDoc.data();
          const location = complejo.ciudad || complejo.direccion || 'Argentina';

          // Obtener pronóstico del clima
          const weatherData = await this.getWeatherForecast(location, reserva.fecha);

          if (weatherData.hasAdverseWeather) {
            // Obtener información del usuario
            const userDoc = await db.collection('users').doc(reserva.usuarioId).get();
            if (!userDoc.exists) {
              console.log(`Usuario no encontrado para reserva ${reserva.id}`);
              continue;
            }

            const user = userDoc.data();

            // Verificar si el usuario tiene habilitadas las alertas climáticas
            const canReceive = await notificationService.canUserReceiveNotification(
              reserva.usuarioId, 
              'weatherAlerts'
            );

            if (canReceive && user.pushToken) {
              // Enviar alerta climática
              const mainCondition = weatherData.adverseConditions[0];
              await notificationService.sendWeatherAlert(
                user.pushToken,
                reserva.canchaNombre,
                reserva.fecha,
                mainCondition.description,
                reserva.usuarioId
              );

              alertsSent++;
              console.log(`🌧️ Alerta climática enviada para reserva ${reserva.id}`);
            }
          }
        } catch (error) {
          console.error(`Error procesando reserva ${reserva.id}:`, error.message);
        }
      }

      console.log(`✅ Verificación completada. ${alertsSent} alertas enviadas`);
      return { processed: reservas.length, alerts: alertsSent };
    } catch (error) {
      console.error('Error en verificación climática:', error);
      throw error;
    }
  }

  // Obtener clima actual para una ubicación
  async getCurrentWeather(location) {
    try {
      const coordinates = await this.getCoordinates(location);
      
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: coordinates.lat,
          lon: coordinates.lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'es',
        },
      });

      return {
        location,
        temperature: response.data.main.temp,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        icon: response.data.weather[0].icon,
      };
    } catch (error) {
      console.error('Error obteniendo clima actual:', error.message);
      throw error;
    }
  }

  // Verificar si las condiciones son adecuadas para jugar pádel
  isWeatherSuitableForPadel(weatherData) {
    if (!weatherData || weatherData.hasAdverseWeather) {
      return false;
    }

    // Condiciones ideales para pádel
    const conditions = weatherData.forecast;
    
    for (const condition of conditions) {
      const temp = condition.main.temp;
      const wind = condition.wind.speed;
      const weather = condition.weather[0].main.toLowerCase();

      // Demasiado frío, calor, viento o lluvia
      if (temp < 10 || temp > 30 || wind > 8 || weather.includes('rain')) {
        return false;
      }
    }

    return true;
  }
}

module.exports = new WeatherService();
