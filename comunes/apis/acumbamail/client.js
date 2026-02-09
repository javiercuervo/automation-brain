/**
 * Cliente API para Acumbamail
 * Documentación: https://acumbamail.com/api/doc/
 */

const BASE_URL = 'https://acumbamail.com/api/1';

export class AcumbamailClient {
  constructor(authToken) {
    if (!authToken) {
      throw new Error('ACUMBAMAIL_AUTH_TOKEN es requerido');
    }
    this.authToken = authToken;
  }

  async request(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}/`);

    // Acumbamail usa POST con form-urlencoded para la mayoría de endpoints
    const body = new URLSearchParams({
      auth_token: this.authToken,
      response_type: 'json',
      ...params,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Acumbamail API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Acumbamail retorna errores en el cuerpo de la respuesta
    if (data.error) {
      throw new Error(`Acumbamail error: ${data.error}`);
    }

    return data;
  }

  // ========== LISTAS ==========

  /**
   * Obtener todas las listas de suscriptores
   * @returns {Promise<Array>} - Array de listas
   */
  async getLists() {
    return this.request('/getLists');
  }

  /**
   * Crear una nueva lista
   * @param {string} name - Nombre de la lista
   * @param {string} senderEmail - Email del remitente
   * @param {object} options - Opciones adicionales
   * @returns {Promise<object>} - Lista creada
   */
  async createList(name, senderEmail, options = {}) {
    return this.request('/createList', {
      name,
      sender_email: senderEmail,
      ...options,
    });
  }

  /**
   * Eliminar una lista
   * @param {string} listId - ID de la lista
   * @returns {Promise<object>} - Resultado
   */
  async deleteList(listId) {
    return this.request('/deleteList', { list_id: listId });
  }

  // ========== SUSCRIPTORES ==========

  /**
   * Añadir un suscriptor a una lista
   * @param {string} listId - ID de la lista
   * @param {string} email - Email del suscriptor
   * @param {object} mergeFields - Campos personalizados
   * @param {object} options - Opciones (double_optin, welcome_email, etc.)
   * @returns {Promise<object>} - Suscriptor añadido
   */
  async addSubscriber(listId, email, mergeFields = {}, options = {}) {
    const params = {
      list_id: listId,
      email,
      ...options,
    };

    // Añadir merge fields
    for (const [key, value] of Object.entries(mergeFields)) {
      params[`merge_fields[${key}]`] = value;
    }

    return this.request('/addSubscriber', params);
  }

  /**
   * Obtener suscriptores de una lista
   * @param {string} listId - ID de la lista
   * @param {object} options - Opciones de paginación
   * @returns {Promise<Array>} - Array de suscriptores
   */
  async getSubscribers(listId, options = {}) {
    return this.request('/getSubscribers', {
      list_id: listId,
      page: options.page || 1,
      per_page: options.perPage || 100,
      ...options,
    });
  }

  /**
   * Obtener información de un suscriptor
   * @param {string} listId - ID de la lista
   * @param {string} email - Email del suscriptor
   * @returns {Promise<object>} - Datos del suscriptor
   */
  async getSubscriberInfo(listId, email) {
    return this.request('/getSubscriberInfo', {
      list_id: listId,
      email,
    });
  }

  /**
   * Actualizar suscriptor
   * @param {string} listId - ID de la lista
   * @param {string} email - Email del suscriptor
   * @param {object} mergeFields - Campos a actualizar
   * @returns {Promise<object>} - Resultado
   */
  async updateSubscriber(listId, email, mergeFields) {
    const params = {
      list_id: listId,
      email,
    };

    for (const [key, value] of Object.entries(mergeFields)) {
      params[`merge_fields[${key}]`] = value;
    }

    return this.request('/updateSubscriber', params);
  }

  /**
   * Dar de baja un suscriptor
   * @param {string} listId - ID de la lista
   * @param {string} email - Email del suscriptor
   * @returns {Promise<object>} - Resultado
   */
  async unsubscribe(listId, email) {
    return this.request('/unsubscribeSubscriber', {
      list_id: listId,
      email,
    });
  }

  // ========== CAMPAÑAS ==========

  /**
   * Obtener campañas
   * @param {object} options - Filtros
   * @returns {Promise<Array>} - Array de campañas
   */
  async getCampaigns(options = {}) {
    return this.request('/getCampaigns', options);
  }

  /**
   * Crear una campaña
   * @param {object} campaignData - Datos de la campaña
   * @returns {Promise<object>} - Campaña creada
   */
  async createCampaign(campaignData) {
    return this.request('/createCampaign', campaignData);
  }

  /**
   * Obtener estadísticas de una campaña
   * @param {string} campaignId - ID de la campaña
   * @returns {Promise<object>} - Estadísticas
   */
  async getCampaignStats(campaignId) {
    return this.request('/getCampaignStats', { campaign_id: campaignId });
  }

  // ========== TEMPLATES ==========

  /**
   * Obtener templates disponibles
   * @returns {Promise<Array>} - Array de templates
   */
  async getTemplates() {
    return this.request('/getTemplates');
  }
}

export default AcumbamailClient;
