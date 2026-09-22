import Papa from 'papaparse'
import type { BenchItem } from '../types/bench'

// Sheet columns expected: latitude, longitude, place, date, type
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSIFBskZEtyavXDwVk2iGWDB7bPFIYpCMrGpPwDT_kxR835tO95V_9NseIHGnF7eurE-_-246cowtk/pub?output=csv'

function cleanHeader(header: string): string {
  return String(header || '')
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
}

function cleanValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '')
}

function parseCsv(csvText: string, delimiter = '') {
  return Papa.parse<BenchItem>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: cleanHeader,
    transform: cleanValue,
  })
}

function hasCoordinateColumns(row: BenchItem): boolean {
  return (
    Object.prototype.hasOwnProperty.call(row, 'latitude') &&
    Object.prototype.hasOwnProperty.call(row, 'longitude')
  )
}

function removeEmptyRows(items: BenchItem[]): BenchItem[] {
  return items.filter((item) =>
    Object.values(item).some((value) => String(value ?? '').trim() !== ''),
  )
}

export async function fetchBenchItems(): Promise<BenchItem[]> {
  const response = await fetch(CSV_URL)

  if (!response.ok) {
    throw new Error(`CSV request failed: ${response.status}`)
  }

  const csvText = await response.text()

  let parsed = parseCsv(csvText)
  let firstRow = parsed.data[0] || {}

  if (!hasCoordinateColumns(firstRow)) {
    parsed = parseCsv(csvText, '|')
    firstRow = parsed.data[0] || {}
  }

  if (!hasCoordinateColumns(firstRow)) {
    throw new Error('CSV does not contain latitude and longitude columns')
  }

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing errors:', parsed.errors)
  }

  return removeEmptyRows(parsed.data)
}
