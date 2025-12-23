const FIELD_MAP = {
  status: "customers.status",
  plan: "customers.plan",
  web_sessions: "customers.web_sessions",
  last_seen: "customers.last_seen"
};

const OPERATOR_MAP = {
  "=": "=",
  "!=": "!=",
  ">": ">",
  "<": "<",
  ">=": ">=",
  "<=": "<="
};

function buildWhereClause(node, params) {
  // GROUP
  if (node.rules && Array.isArray(node.rules)) {
    const parts = node.rules.map(r => buildWhereClause(r, params));
    return `(${parts.join(` ${node.condition} `)})`;
  }

  // LEAF RULE
  const column = FIELD_MAP[node.field];
  const operator = OPERATOR_MAP[node.operator];

  if (!column || !operator) {
    throw new Error("Invalid field or operator");
  }

  params.push(node.value);
  return `${column} ${operator} ?`;
}

function buildSQLPreview(ast) {
  const params = [];
  const where = buildWhereClause(ast, params);

  let i = 0;
  return `
SELECT * FROM customers
WHERE ${where.replace(/\?/g, () => JSON.stringify(params[i++]))}
`.trim();
}

module.exports = {
  buildWhereClause,
  buildSQLPreview
};
