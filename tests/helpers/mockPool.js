/**
 * Mock PostgreSQL pool for testing.
 * Stores data in-memory tables and pattern-matches SQL queries.
 * Loaded fixtures are converted from camelCase JSON/CSV to snake_case DB column names.
 */
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');

// In-memory tables
const tables = {
    admins: [],
    password_reset_tokens: [],
    assessments: [],
    cancer_types: [],
    questions: [],
    question_assignments: [],
    settings: []
};

// Auto-increment counters
let assignmentIdCounter = 1;
let tokenIdCounter = 1;

function parseCSVLine(line) {
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(field);
                field = '';
            } else {
                field += ch;
            }
        }
    }
    fields.push(field);
    return fields.map(f => f.replace(/\r$/, ''));
}

function loadCSV(filename) {
    const filepath = path.join(FIXTURES_DIR, filename);
    if (!fs.existsSync(filepath)) return [];
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((h, i) => {
            row[h.toLowerCase().trim()] = values[i] ?? '';
        });
        return row;
    });
}

function loadJSON(filename) {
    const filepath = path.join(FIXTURES_DIR, filename);
    if (!fs.existsSync(filepath)) return [];
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

export function loadFixtures() {
    assignmentIdCounter = 1;
    tokenIdCounter = 1;

    // Load admins from JSON fixture (camelCase -> snake_case)
    const adminsJson = loadJSON('admins.json');
    tables.admins = adminsJson.map(a => ({
        id: a.id,
        email: a.email,
        password: a.password,
        role: a.role,
        name: a.name,
        require_password_reset: a.requirePasswordReset || false,
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: a.updatedAt || new Date().toISOString()
    }));

    tables.password_reset_tokens = [];

    // Load cancer types from CSV
    const ctRows = loadCSV('cancer_types.csv');
    tables.cancer_types = ctRows.map(row => ({
        ...row,
        sort_order: row.sort_order ?? 0
    }));

    // Load question bank from CSV
    tables.questions = loadCSV('question_bank.csv');

    // Load assignments from CSV
    const assignRows = loadCSV('assignments.csv');
    tables.question_assignments = assignRows.map(row => ({
        id: assignmentIdCounter++,
        questionid: row.questionid,
        assessmentid: row.assessmentid,
        targetcancertype: row.targetcancertype,
        weight: row.weight !== '' ? parseFloat(row.weight) : null,
        yesvalue: row.yesvalue !== '' ? parseFloat(row.yesvalue) : null,
        novalue: row.novalue !== '' ? parseFloat(row.novalue) : null,
        category: row.category || '',
        minage: row.minage !== '' && row.minage !== undefined ? parseInt(row.minage) : null
    }));

    // Load assessments from CSV
    const assessRows = loadCSV('assessments.csv');
    tables.assessments = assessRows.map(row => ({
        id: row.id,
        age: row.age || null,
        gender: row.gender || null,
        family_history: row.familyhistory || row.family_history || null,
        assessment_type: row.assessmenttype || row.assessment_type || null,
        risk_score: row.riskscore || row.risk_score || null,
        risk_level: row.risklevel || row.risk_level || null,
        category_risks: tryParseJSON(row.categoryrisks || row.category_risks || '{}'),
        questions_answers: tryParseJSON(row.questionsanswers || row.questions_answers || '[]'),
        created_at: row.timestamp || row.created_at || new Date().toISOString()
    }));

    // Load settings from fixture JSON files
    tables.settings = [];
    const settingsFiles = [
        { key: 'theme', file: 'theme.json' },
        { key: 'pdpa', file: 'pdpa.json' },
        { key: 'ui_translations', file: 'ui_translations.json' },
        { key: 'recommendations', file: 'recommendations.json' }
    ];
    for (const { key, file } of settingsFiles) {
        try {
            const data = loadJSON(file);
            tables.settings.push({
                key,
                value: data,
                updated_at: new Date().toISOString()
            });
        } catch { /* file may not exist */ }
    }
}

function tryParseJSON(str) {
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return str; }
}

function matchesWhere(row, sql, params) {
    // Simple WHERE clause matching for common patterns
    const lowerSql = sql.toLowerCase();

    // WHERE id = $N
    const idMatch = lowerSql.match(/where\s+id\s*=\s*\$(\d+)/);
    if (idMatch) {
        const paramIdx = parseInt(idMatch[1]) - 1;
        if (row.id !== params[paramIdx]) return false;
    }

    // WHERE email = $N or LOWER(email) = LOWER($N)
    const emailMatch = lowerSql.match(/where\s+(?:lower\()?email(?:\))?\s*=\s*(?:lower\()?\$(\d+)(?:\))?/);
    if (emailMatch && !idMatch) {
        const paramIdx = parseInt(emailMatch[1]) - 1;
        if (row.email?.toLowerCase() !== params[paramIdx]?.toLowerCase()) return false;
    }

    // WHERE token = $N
    const tokenMatch = lowerSql.match(/where\s+token\s*=\s*\$(\d+)/);
    if (tokenMatch) {
        const paramIdx = parseInt(tokenMatch[1]) - 1;
        if (row.token !== params[paramIdx]) return false;
    }

    // WHERE key = $N (for settings)
    const keyMatch = lowerSql.match(/where\s+key\s*=\s*\$(\d+)/);
    if (keyMatch) {
        const paramIdx = parseInt(keyMatch[1]) - 1;
        if (row.key !== params[paramIdx]) return false;
    }

    // WHERE questionid = $N
    const questionIdMatch = lowerSql.match(/where\s+questionid\s*=\s*\$(\d+)/);
    if (questionIdMatch) {
        const paramIdx = parseInt(questionIdMatch[1]) - 1;
        if (row.questionid !== params[paramIdx]) return false;
    }

    // WHERE lower(assessmentid) = $N
    const assessmentIdMatch = lowerSql.match(/where\s+lower\(assessmentid\)\s*=\s*(?:lower\()?\$(\d+)(?:\))?/);
    if (assessmentIdMatch) {
        const paramIdx = parseInt(assessmentIdMatch[1]) - 1;
        if (row.assessmentid?.toLowerCase() !== params[paramIdx]?.toLowerCase()) return false;
    }

    // AND expires_at > NOW()
    if (lowerSql.includes('expires_at > now()')) {
        if (new Date(row.expires_at) <= new Date()) return false;
    }

    // AND (minage IS NULL OR minage <= $N)
    const minAgeMatch = lowerSql.match(/minage\s*<=\s*\$(\d+)/);
    if (minAgeMatch && lowerSql.includes('minage is null or minage')) {
        const paramIdx = parseInt(minAgeMatch[1]) - 1;
        const userAge = params[paramIdx];
        if (row.minage !== null && row.minage !== undefined && row.minage !== '' && parseInt(row.minage) > userAge) {
            return false;
        }
    }

    // WHERE id = ANY($N)
    const anyMatch = lowerSql.match(/where\s+id\s*=\s*any\(\$(\d+)\)/);
    if (anyMatch) {
        const paramIdx = parseInt(anyMatch[1]) - 1;
        const ids = params[paramIdx];
        if (Array.isArray(ids) && !ids.includes(row.id)) return false;
    }

    // WHERE created_at >= $N  (startDate filter)
    const createdAtGteMatch = lowerSql.match(/created_at\s*>=\s*\$(\d+)/);
    if (createdAtGteMatch) {
        const paramIdx = parseInt(createdAtGteMatch[1]) - 1;
        const fromDate = params[paramIdx];
        if (fromDate && new Date(row.created_at) < new Date(fromDate)) return false;
    }

    // WHERE DATE(created_at) <= $N  (endDate filter — compare ISO date prefix)
    const createdAtDateLteMatch = lowerSql.match(/date\(created_at\)\s*<=\s*\$(\d+)/);
    if (createdAtDateLteMatch) {
        const paramIdx = parseInt(createdAtDateLteMatch[1]) - 1;
        const toDate = params[paramIdx];
        if (toDate && (row.created_at || '').substring(0, 10) > toDate) return false;
    }

    return true;
}

function getTableName(sql) {
    const lower = sql.toLowerCase();
    // INSERT INTO tablename
    let m = lower.match(/insert\s+into\s+(\w+)/);
    if (m) return m[1];
    // DELETE FROM tablename
    m = lower.match(/delete\s+from\s+(\w+)/);
    if (m) return m[1];
    // UPDATE tablename
    m = lower.match(/update\s+(\w+)/);
    if (m) return m[1];
    // SELECT ... FROM tablename
    m = lower.match(/from\s+(\w+)/);
    if (m) return m[1];
    return null;
}

function handleInsert(tableName, sql, params) {
    const table = tables[tableName];
    if (!table) return { rows: [] };

    const lowerSql = sql.toLowerCase();

    // Parse column names from INSERT INTO table (col1, col2, ...) VALUES (...)
    const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (!colMatch) return { rows: [] };

    const columns = colMatch[1].split(',').map(c => c.trim().toLowerCase());
    const row = {};
    columns.forEach((col, i) => {
        let val = params[i];
        // Handle ::jsonb cast
        if (typeof val === 'string') {
            try {
                // Only parse if it looks like JSON and the column is a JSONB column
                if ((col === 'category_risks' || col === 'questions_answers' || col === 'value') &&
                    (val.startsWith('{') || val.startsWith('[') || val.startsWith('"'))) {
                    val = JSON.parse(val);
                }
            } catch { /* keep as string */ }
        }
        row[col] = val;
    });

    // Auto-assign IDs for auto-increment tables
    if (tableName === 'question_assignments' && !row.id) {
        row.id = assignmentIdCounter++;
    }
    if (tableName === 'password_reset_tokens' && !row.id) {
        row.id = tokenIdCounter++;
    }

    // Handle NOW() timestamps
    if (lowerSql.includes('now()')) {
        if (!row.created_at) row.created_at = new Date().toISOString();
        if (!row.updated_at) row.updated_at = new Date().toISOString();
    }

    // Enforce unique constraint on 'id' column for tables with primary keys
    // (except UPSERT queries which handle conflicts explicitly)
    if (!lowerSql.includes('on conflict') && row.id !== undefined) {
        const pkTables = ['admins', 'questions', 'cancer_types', 'assessments'];
        if (pkTables.includes(tableName)) {
            const duplicate = table.find(r => r.id === row.id);
            if (duplicate) {
                throw new Error(`duplicate key value violates unique constraint "${tableName}_pkey"`);
            }
        }
    }

    table.push(row);

    if (lowerSql.includes('on conflict')) {
        // UPSERT: find existing row with same key and update it
        const keyCol = lowerSql.match(/on\s+conflict\s*\((\w+)\)/)?.[1];
        if (keyCol) {
            const existing = table.findIndex((r, idx) => idx < table.length - 1 && r[keyCol] === row[keyCol]);
            if (existing !== -1) {
                table.splice(existing, 1); // Remove old row, keep new one
            }
        }
    }

    if (lowerSql.includes('returning')) {
        return { rows: [{ ...row }] };
    }
    return { rows: [] };
}

function handleSelect(tableName, sql, params) {
    const table = tables[tableName];
    if (!table) return { rows: [] };

    const lowerSql = sql.toLowerCase();

    // COUNT query
    if (lowerSql.includes('count(*)')) {
        let filtered = table;
        // Apply WHERE conditions
        if (lowerSql.includes('where')) {
            filtered = table.filter(row => {
                // role = 'super_admin'
                if (lowerSql.includes("role = 'super_admin'")) {
                    return row.role === 'super_admin';
                }
                return matchesWhere(row, sql, params);
            });
        }
        return { rows: [{ count: String(filtered.length) }] };
    }

    let rows = table.filter(row => matchesWhere(row, sql, params));

    // ORDER BY
    const orderMatch = lowerSql.match(/order\s+by\s+(\w+)\s+(asc|desc)?/);
    if (orderMatch) {
        const col = orderMatch[1];
        const desc = orderMatch[2] === 'desc';
        rows.sort((a, b) => {
            const va = a[col] ?? '';
            const vb = b[col] ?? '';
            return desc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
        });
        // Handle secondary sort
        const secondOrder = lowerSql.match(/order\s+by\s+\w+\s+(?:asc|desc)?\s*,\s*(\w+)\s+(asc|desc)?/);
        if (secondOrder) {
            const col2 = secondOrder[1];
            rows.sort((a, b) => {
                const v1a = a[col] ?? '';
                const v1b = b[col] ?? '';
                if (v1a !== v1b) return desc ? (v1b > v1a ? 1 : -1) : (v1a > v1b ? 1 : -1);
                const v2a = a[col2] ?? '';
                const v2b = b[col2] ?? '';
                return v2a > v2b ? 1 : -1;
            });
        }
    }

    // LIMIT
    const limitMatch = lowerSql.match(/limit\s+(\d+)/);
    if (limitMatch) {
        rows = rows.slice(0, parseInt(limitMatch[1]));
    }

    return { rows: rows.map(r => ({ ...r })) };
}

function handleUpdate(tableName, sql, params) {
    const table = tables[tableName];
    if (!table) return { rows: [] };

    const lowerSql = sql.toLowerCase();
    const updated = [];

    for (const row of table) {
        if (!matchesWhere(row, sql, params)) continue;

        // Parse SET clauses: field = $N or field = COALESCE($N, field) or field = value
        const setMatch = sql.match(/SET\s+([\s\S]+?)(?:\s+WHERE)/i);
        if (setMatch) {
            // Split by commas that are NOT inside parentheses
            const setClauses = [];
            let current = '';
            let depth = 0;
            for (const ch of setMatch[1]) {
                if (ch === '(') depth++;
                else if (ch === ')') depth--;
                else if (ch === ',' && depth === 0) {
                    setClauses.push(current.trim());
                    current = '';
                    continue;
                }
                current += ch;
            }
            if (current.trim()) setClauses.push(current.trim());
            for (const clause of setClauses) {
                // field = COALESCE($N, field)
                const coalesceMatch = clause.match(/(\w+)\s*=\s*COALESCE\(\$(\d+),\s*\w+\)/i);
                if (coalesceMatch) {
                    const col = coalesceMatch[1].toLowerCase();
                    const paramIdx = parseInt(coalesceMatch[2]) - 1;
                    if (params[paramIdx] !== undefined && params[paramIdx] !== null) {
                        row[col] = params[paramIdx];
                    }
                    continue;
                }
                // field = $N
                const directMatch = clause.match(/(\w+)\s*=\s*\$(\d+)/i);
                if (directMatch) {
                    const col = directMatch[1].toLowerCase();
                    const paramIdx = parseInt(directMatch[2]) - 1;
                    row[col] = params[paramIdx];
                    continue;
                }
                // field = NOW()
                const nowMatch = clause.match(/(\w+)\s*=\s*NOW\(\)/i);
                if (nowMatch) {
                    row[nowMatch[1].toLowerCase()] = new Date().toISOString();
                    continue;
                }
                // field = false / true
                const boolMatch = clause.match(/(\w+)\s*=\s*(true|false)/i);
                if (boolMatch) {
                    row[boolMatch[1].toLowerCase()] = boolMatch[2].toLowerCase() === 'true';
                }
            }
        }

        updated.push({ ...row });
    }

    if (lowerSql.includes('returning')) {
        return { rows: updated };
    }
    return { rows: [] };
}

function handleDelete(tableName, sql, params) {
    const table = tables[tableName];
    if (!table) return { rows: [] };

    const lowerSql = sql.toLowerCase();

    // DELETE FROM table (no WHERE = truncate)
    if (!lowerSql.includes('where')) {
        const removed = [...table];
        table.length = 0;
        if (lowerSql.includes('returning')) return { rows: removed };
        return { rows: [] };
    }

    const deleted = [];
    for (let i = table.length - 1; i >= 0; i--) {
        if (matchesWhere(table[i], sql, params)) {
            deleted.push({ ...table[i] });
            table.splice(i, 1);
        }
    }

    if (lowerSql.includes('returning')) {
        return { rows: deleted };
    }
    return { rows: [] };
}

export function createMockQuery() {
    return async function mockQuery(sql, params = []) {
        const lowerSql = sql.toLowerCase().trim();
        const tableName = getTableName(sql);

        if (lowerSql.startsWith('select')) {
            return handleSelect(tableName, sql, params);
        }
        if (lowerSql.startsWith('insert')) {
            return handleInsert(tableName, sql, params);
        }
        if (lowerSql.startsWith('update')) {
            return handleUpdate(tableName, sql, params);
        }
        if (lowerSql.startsWith('delete')) {
            return handleDelete(tableName, sql, params);
        }

        return { rows: [] };
    };
}

export function resetFixtures() {
    loadFixtures();
}

export { tables };
