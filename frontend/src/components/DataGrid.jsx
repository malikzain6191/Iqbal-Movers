import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

const OPERATORS = [
  ['contains', 'Contains'],
  ['equals', 'Is exactly'],
  ['startsWith', 'Starts with'],
  ['oneOf', 'Is one of'],
  ['empty', 'Is empty']
];

function filterRows(row, columnId, filter) {
  const rawValue = row.getValue(columnId);
  const value = String(rawValue ?? '').trim().toLocaleLowerCase();
  const term = String(filter.value ?? '').trim().toLocaleLowerCase();

  if (filter.operator === 'empty') return value.length === 0;
  if (!term) return true;
  if (filter.operator === 'equals') return value === term;
  if (filter.operator === 'startsWith') return value.startsWith(term);
  if (filter.operator === 'oneOf') {
    return term.split(',').map((part) => part.trim()).filter(Boolean).includes(value);
  }
  return value.includes(term);
}

export default function DataGrid({ columns, data, emptyMessage = 'No records found' }) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState('contains');
  const [filterValue, setFilterValue] = useState('');

  const columnDefinitions = useMemo(() => columns.map((column) => ({
    ...column,
    filterFn: filterRows,
    enableColumnFilter: column.enableColumnFilter !== false
  })), [columns]);

  const table = useReactTable({
    data,
    columns: columnDefinitions,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const filterableColumns = table.getAllLeafColumns().filter((column) => column.getCanFilter());

  function addFilter() {
    if (!filterColumn || (filterOperator !== 'empty' && !filterValue.trim())) return;
    setColumnFilters((current) => [
      ...current.filter((filter) => filter.id !== filterColumn),
      { id: filterColumn, value: { operator: filterOperator, value: filterValue } }
    ]);
    setFilterValue('');
  }

  function removeFilter(columnId) {
    setColumnFilters((current) => current.filter((filter) => filter.id !== columnId));
  }

  return (
    <div className="data-grid">
      <div className="data-grid-toolbar">
        <div className="data-grid-filter-form">
          <label className="sr-only" htmlFor="grid-filter-column">Filter column</label>
          <select id="grid-filter-column" value={filterColumn} onChange={(event) => setFilterColumn(event.target.value)}>
            <option value="">Choose column</option>
            {filterableColumns.map((column) => <option key={column.id} value={column.id}>{String(column.columnDef.header)}</option>)}
          </select>
          <label className="sr-only" htmlFor="grid-filter-operator">Filter operator</label>
          <select id="grid-filter-operator" value={filterOperator} onChange={(event) => setFilterOperator(event.target.value)}>
            {OPERATORS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="sr-only" htmlFor="grid-filter-value">Filter value</label>
          <input
            id="grid-filter-value"
            value={filterValue}
            disabled={filterOperator === 'empty'}
            placeholder={filterOperator === 'oneOf' ? 'Separate values with commas' : 'Filter value'}
            onChange={(event) => setFilterValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addFilter(); }}
          />
          <button className="btn sm gh" onClick={addFilter} disabled={!filterColumn || (filterOperator !== 'empty' && !filterValue.trim())}>Add filter</button>
        </div>
        {!!columnFilters.length && (
          <div className="data-grid-active-filters">
            {columnFilters.map((filter) => {
              const column = table.getColumn(filter.id);
              const operatorLabel = OPERATORS.find(([value]) => value === filter.value.operator)?.[1];
              return (
                <button key={filter.id} className="data-grid-filter-chip" onClick={() => removeFilter(filter.id)} title="Remove filter">
                  {String(column?.columnDef.header)} {operatorLabel.toLowerCase()}{filter.value.operator === 'empty' ? '' : ` “${filter.value.value}”`} ×
                </button>
              );
            })}
            <button className="btn sm gh" onClick={() => setColumnFilters([])}>Clear all</button>
          </div>
        )}
      </div>
      <div className="data-grid-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        className="data-grid-heading"
                        disabled={!header.column.getCanSort()}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="empty">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="data-grid-count">{table.getRowModel().rows.length} of {data.length} records</div>
    </div>
  );
}