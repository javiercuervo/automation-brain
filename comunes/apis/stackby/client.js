/**
 * Cliente API para Stackby
 * Documentación: https://help.stackby.com/article/429-stackby-api
 */

const BASE_URL = 'https://api.stackby.com/v1';

export class StackbyClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('STACKBY_API_KEY es requerida');
    }
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stackby API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Listar filas de una tabla
   * @param {string} stackId - ID del stack
   * @param {string} tableId - ID o nombre de la tabla
   * @param {object} options - Opciones de filtrado
   * @returns {Promise<object>} - Filas de la tabla
   */
  async listRows(stackId, tableId, options = {}) {
    const params = new URLSearchParams();
    if (options.view) params.append('view', options.view);
    if (options.maxRecords) params.append('maxRecords', options.maxRecords);
    if (options.offset) params.append('offset', options.offset);
    if (options.filterByFormula) params.append('filterByFormula', options.filterByFormula);
    if (options.sort) params.append('sort', JSON.stringify(options.sort));

    const queryString = params.toString();
    const endpoint = `/rowlist/${stackId}/${encodeURIComponent(tableId)}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * Obtener una fila específica
   * @param {string} stackId - ID del stack
   * @param {string} tableId - ID o nombre de la tabla
   * @param {string} rowId - ID de la fila
   * @returns {Promise<object>} - Datos de la fila
   */
  async getRow(stackId, tableId, rowId) {
    return this.request(`/rowlist/${stackId}/${encodeURIComponent(tableId)}/${rowId}`);
  }

  /**
   * Crear filas en una tabla
   * @param {string} stackId - ID del stack
   * @param {string} tableId - ID o nombre de la tabla
   * @param {Array<object>} records - Array de registros a crear
   * @returns {Promise<object>} - Filas creadas
   */
  async createRows(stackId, tableId, records) {
    return this.request(`/rowcreate/${stackId}/${encodeURIComponent(tableId)}`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  }

  /**
   * Actualizar filas en una tabla
   * @param {string} stackId - ID del stack
   * @param {string} tableId - ID o nombre de la tabla
   * @param {Array<object>} records - Array de registros a actualizar (deben incluir id)
   * @returns {Promise<object>} - Filas actualizadas
   */
  async updateRows(stackId, tableId, records) {
    return this.request(`/rowupdate/${stackId}/${encodeURIComponent(tableId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    });
  }

  /**
   * Eliminar filas de una tabla
   * @param {string} stackId - ID del stack
   * @param {string} tableId - ID o nombre de la tabla
   * @param {Array<string>} rowIds - Array de IDs de filas a eliminar
   * @returns {Promise<object>} - Resultado de la eliminación
   */
  async deleteRows(stackId, tableId, rowIds) {
    const params = rowIds.map(id => `rowIds[]=${id}`).join('&');
    return this.request(`/rowdelete/${stackId}/${encodeURIComponent(tableId)}?${params}`, {
      method: 'DELETE',
    });
  }

  /**
   * Buscar filas en una tabla
   * @param {string} stackId - ID del stack
   * @param {string} tableId - ID o nombre de la tabla
   * @param {string} formula - Fórmula de filtrado (ej: "{Email} = 'test@test.com'")
   * @returns {Promise<object>} - Filas que coinciden
   */
  async searchRows(stackId, tableId, formula) {
    return this.listRows(stackId, tableId, { filterByFormula: formula });
  }
}

export default StackbyClient;
