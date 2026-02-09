/**
 * Cliente API para Holded
 * Documentación: https://developers.holded.com/
 */

const BASE_URL = 'https://api.holded.com/api';

export class HoldedClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('HOLDED_API_KEY es requerida');
    }
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Holded API error ${response.status}: ${errorText}`);
    }

    // Algunos endpoints pueden devolver vacío en DELETE
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // ========== CONTACTOS ==========

  /**
   * Listar contactos
   * @param {object} options - Filtros opcionales
   * @returns {Promise<Array>} - Array de contactos
   */
  async listContacts(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.search) params.append('search', options.search);
    if (options.type) params.append('type', options.type); // client, supplier, lead, debtor, creditor

    const queryString = params.toString();
    return this.request(`/invoicing/v1/contacts${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener un contacto por ID
   * @param {string} contactId - ID del contacto
   * @returns {Promise<object>} - Datos del contacto
   */
  async getContact(contactId) {
    return this.request(`/invoicing/v1/contacts/${contactId}`);
  }

  /**
   * Crear un contacto
   * @param {object} contactData - Datos del contacto
   * @returns {Promise<object>} - Contacto creado
   */
  async createContact(contactData) {
    return this.request('/invoicing/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  /**
   * Actualizar un contacto
   * @param {string} contactId - ID del contacto
   * @param {object} contactData - Datos a actualizar
   * @returns {Promise<object>} - Contacto actualizado
   */
  async updateContact(contactId, contactData) {
    return this.request(`/invoicing/v1/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  /**
   * Eliminar un contacto
   * @param {string} contactId - ID del contacto
   * @returns {Promise<object>} - Resultado
   */
  async deleteContact(contactId) {
    return this.request(`/invoicing/v1/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // ========== FACTURAS ==========

  /**
   * Listar facturas
   * @param {object} options - Filtros opcionales
   * @returns {Promise<Array>} - Array de facturas
   */
  async listInvoices(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.contactId) params.append('contactId', options.contactId);
    if (options.stardate) params.append('stardate', options.stardate);
    if (options.enddate) params.append('enddate', options.enddate);
    if (options.status) params.append('status', options.status);

    const queryString = params.toString();
    return this.request(`/invoicing/v1/documents/invoice${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener una factura por ID
   * @param {string} invoiceId - ID de la factura
   * @returns {Promise<object>} - Datos de la factura
   */
  async getInvoice(invoiceId) {
    return this.request(`/invoicing/v1/documents/invoice/${invoiceId}`);
  }

  /**
   * Crear una factura
   * @param {object} invoiceData - Datos de la factura
   * @returns {Promise<object>} - Factura creada
   */
  async createInvoice(invoiceData) {
    return this.request('/invoicing/v1/documents/invoice', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  /**
   * Marcar factura como pagada
   * @param {string} invoiceId - ID de la factura
   * @param {object} paymentData - Datos del pago
   * @returns {Promise<object>} - Resultado
   */
  async payInvoice(invoiceId, paymentData = {}) {
    return this.request(`/invoicing/v1/documents/invoice/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  /**
   * Enviar factura por email
   * @param {string} invoiceId - ID de la factura
   * @param {object} emailData - Datos del email
   * @returns {Promise<object>} - Resultado
   */
  async sendInvoice(invoiceId, emailData = {}) {
    return this.request(`/invoicing/v1/documents/invoice/${invoiceId}/send`, {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  }

  // ========== PRODUCTOS ==========

  /**
   * Listar productos
   * @param {object} options - Filtros opcionales
   * @returns {Promise<Array>} - Array de productos
   */
  async listProducts(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);

    const queryString = params.toString();
    return this.request(`/invoicing/v1/products${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener un producto por ID
   * @param {string} productId - ID del producto
   * @returns {Promise<object>} - Datos del producto
   */
  async getProduct(productId) {
    return this.request(`/invoicing/v1/products/${productId}`);
  }

  /**
   * Crear un producto
   * @param {object} productData - Datos del producto
   * @returns {Promise<object>} - Producto creado
   */
  async createProduct(productData) {
    return this.request('/invoicing/v1/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  // ========== OTROS DOCUMENTOS ==========

  /**
   * Listar presupuestos
   * @param {object} options - Filtros opcionales
   * @returns {Promise<Array>} - Array de presupuestos
   */
  async listQuotes(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);

    const queryString = params.toString();
    return this.request(`/invoicing/v1/documents/estimate${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Listar pedidos
   * @param {object} options - Filtros opcionales
   * @returns {Promise<Array>} - Array de pedidos
   */
  async listOrders(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);

    const queryString = params.toString();
    return this.request(`/invoicing/v1/documents/salesorder${queryString ? `?${queryString}` : ''}`);
  }

  // ========== INFORMACIÓN DE CUENTA ==========

  /**
   * Obtener información de la cuenta
   * @returns {Promise<object>} - Datos de la cuenta
   */
  async getAccountInfo() {
    return this.request('/invoicing/v1/info');
  }
}

export default HoldedClient;
