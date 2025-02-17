import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react"

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  className?: string
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  className?: string
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableHeaderCellElement> {
  className?: string
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableDataCellElement> {
  className?: string
}
