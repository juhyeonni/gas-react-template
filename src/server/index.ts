/**
 * GAS Backend Entry Point
 *
 * Global functions exported here are available to GAS:
 * - doGet: Web app entry point
 * - include: HTML template includes
 * - apiGet: GET API dispatcher
 * - apiPost: POST API dispatcher
 */

const SHEET_NAME = 'Counter'
const COUNTER_CELL = 'A1'

/**
 * Build-time spreadsheet ID (injected by esbuild from .clasp.json).
 * Fallback chain: bound spreadsheet → script property → build-time constant
 */
declare const __SPREADSHEET_ID__: string

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const active = SpreadsheetApp.getActiveSpreadsheet()
  if (active) return active

  const propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (propId) return SpreadsheetApp.openById(propId)

  if (typeof __SPREADSHEET_ID__ !== 'undefined' && __SPREADSHEET_ID__) {
    return SpreadsheetApp.openById(__SPREADSHEET_ID__)
  }

  throw new Error(
    'SPREADSHEET_ID not configured. Set via: settings page, script property, or .clasp.json'
  )
}

function getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = getSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.getRange(COUNTER_CELL).setValue(0)
  }
  return sheet
}

/**
 * Set spreadsheet ID as script property (called from setup:sheet script).
 */
export function setSpreadsheetId(id: string): { success: boolean; id: string } {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id)
  return { success: true, id }
}

function getCount(): number {
  const value = getSheet().getRange(COUNTER_CELL).getValue()
  return typeof value === 'number' ? value : 0
}

function setCount(value: number): number {
  getSheet().getRange(COUNTER_CELL).setValue(value)
  return value
}

export function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('GAS+React App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

export function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}

export function apiGet(
  action: string,
  _params: Record<string, string> = {}
): unknown {
  switch (action) {
    case 'getCount':
      return { count: getCount() }

    case 'getConfig': {
      const props = PropertiesService.getScriptProperties()
      return {
        spreadsheetId: props.getProperty('SPREADSHEET_ID') || '',
      }
    }

    case 'ping':
      return { message: 'pong', timestamp: new Date().toISOString() }

    default:
      throw new Error(`Unknown GET action: ${action}`)
  }
}

export function apiPost(
  action: string,
  data: Record<string, unknown> = {}
): unknown {
  switch (action) {
    case 'increment': {
      const current = getCount()
      return { count: setCount(current + 1) }
    }

    case 'decrement': {
      const current = getCount()
      return { count: setCount(current - 1) }
    }

    case 'reset':
      return { count: setCount(0) }

    case 'setCount': {
      const value = Number(data.value) || 0
      return { count: setCount(value) }
    }

    case 'setSpreadsheetId': {
      const id = String(data.id || '').trim()
      if (!id) throw new Error('Spreadsheet ID is required')
      PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id)
      return { success: true, spreadsheetId: id }
    }

    default:
      throw new Error(`Unknown POST action: ${action}`)
  }
}
