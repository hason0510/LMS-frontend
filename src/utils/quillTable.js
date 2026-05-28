import { Quill } from "react-quill";
import TableHandler, { rewirteFormats } from "quill1.3.7-table-module";
import "../styles/quillTable.css";

export const QUILL_TABLE_TOOL = TableHandler.toolName;
export const QUILL_TABLE_MODULE = TableHandler.moduleName;

const TABLE_STUB_VALUE = "__ql_table_stub";
const TABLE_GRID_SIZE = 8;
const TABLE_FORMATS = [
  "contain",
  "tableWrapper",
  "table",
  "colgroup",
  "col",
  "tbody",
  "tr",
  "td",
  "tableCellInner",
];

const TABLE_MODULE_OPTIONS = {
  fullWidth: true,
  customSelect: createTableSelect,
  operationMenu: {
    modifyItems: true,
    items: {
      insertColumnLeft: { text: "Insert column left" },
      insertColumnRight: { text: "Insert column right" },
      insertRowTop: { text: "Insert row above" },
      insertRowBottom: { text: "Insert row below" },
      removeCol: { text: "Delete column" },
      removeRow: { text: "Delete row" },
      removeTable: { text: "Delete table" },
      mergeCell: { text: "Merge cells" },
      splitCell: { text: "Split cell" },
      setBackgroundColor: { text: "Cell background" },
      clearBackgroundColor: { text: "Clear cell background" },
      setBorderColor: { text: "Border color" },
      clearBorderColor: { text: "Clear border color" },
    },
  },
};

let quillTableRegistered = false;

function emitTableCreate(root, row, col) {
  root.dispatchEvent(
    new CustomEvent(TableHandler.createEventName, {
      detail: { row, col },
    })
  );
}

function paintTableGrid(root, activeRow = 0, activeCol = 0) {
  root.querySelectorAll("[data-table-cell]").forEach((cell) => {
    const row = Number(cell.dataset.row || 0);
    const col = Number(cell.dataset.col || 0);
    const active = row <= activeRow && col <= activeCol;
    cell.classList.toggle("is-active", active);
  });

  const hint = root.querySelector("[data-table-hint]");
  if (!hint) {
    return;
  }

  hint.textContent = activeRow > 0 && activeCol > 0 ? `${activeRow} x ${activeCol}` : "Insert table";
}

function createTableSelect() {
  const root = document.createElement("div");
  root.className = "create_select";

  const grid = document.createElement("div");
  grid.className = "create_select_block";

  for (let row = 1; row <= TABLE_GRID_SIZE; row += 1) {
    for (let col = 1; col <= TABLE_GRID_SIZE; col += 1) {
      const cell = document.createElement("div");
      cell.className = "create_select_block_item";
      cell.dataset.tableCell = "true";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `Insert ${row} by ${col} table`);

      cell.addEventListener("mouseenter", () => paintTableGrid(root, row, col));
      cell.addEventListener("focus", () => paintTableGrid(root, row, col));
      cell.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        emitTableCreate(root, row, col);
      });
      cell.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          emitTableCreate(root, row, col);
        }
      });

      grid.appendChild(cell);
    }
  }

  const hint = document.createElement("div");
  hint.className = "create_select_size";
  hint.dataset.tableHint = "true";
  hint.textContent = "Insert table";

  root.addEventListener("mouseleave", () => paintTableGrid(root));

  root.appendChild(grid);
  root.appendChild(hint);
  paintTableGrid(root);
  return root;
}

export function ensureQuillTableRegistered() {
  if (quillTableRegistered) {
    return;
  }

  Quill.register({ [`modules/${QUILL_TABLE_MODULE}`]: TableHandler }, true);
  rewirteFormats();
  quillTableRegistered = true;
}

export function createQuillTableControl() {
  return { [QUILL_TABLE_TOOL]: [TABLE_STUB_VALUE] };
}

export function extendQuillFormats(formats = []) {
  return [...new Set([...formats, ...TABLE_FORMATS])];
}

export function buildQuillModules(toolbar, extraModules = {}) {
  ensureQuillTableRegistered();

  return {
    toolbar,
    [QUILL_TABLE_MODULE]: TABLE_MODULE_OPTIONS,
    ...extraModules,
  };
}
