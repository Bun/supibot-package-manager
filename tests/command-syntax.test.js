(async () => {
	const fs = require("fs/promises");
	const espree = require("espree");

	describe("all commands", () => {
		it("should have proper structure", async () => {
			const { strictEqual: equal } = require("assert");
			const commandFiles = await fs.readdir("./commands");
			const commands = await Promise.all(commandFiles.map(dir => fs.readFile(`./commands/${dir}/index.js`)));

			for (const content of commands) {
				const model = espree.parse(content, {
					ecmaVersion: 12,
					sourceType: "module"
				});

				equal(model.type, "Program", "Module must be a program");
				equal(model.sourceType, "module", "Script must be sourced by a module");
				equal(model.body.constructor, Array, "Module body must be an array");
				equal(model.body.length, 1, "Module can only contain one statement");
				equal(model.body[0].type, "ExpressionStatement", "Statement must be an expression");

				const expr = model.body[0].expression;
				equal(expr.type, "AssignmentExpression", "Statement must be an assignment expression");
				equal(expr.operator, "=", "Statement must use the = operator");

				const { left, right } = expr;
				equal(left.computed, false, "Left side of assignment cannot be computed");
				equal(left.object.name, "module", "Assignment must be done to module.exports");
				equal(left.object.type, "Identifier", "Assignment must be done to module.exports");
				equal(left.property.name, "exports", "Assignment must be done to module.exports");
				equal(right.type, "ObjectExpression", "Right side of assignment must be an object expression");

				const { properties } = model.body[0].expression.right;
				const getType = (value) => (value === null) ? "null" : typeof value;
				const allowedProperties = [
					{ name: "Name", valueKind: "Literal", valueTypes: ["string"] },
					{
						name: "Aliases",
						failMessage: "Array of string Literals, or null Literal",
						checkCallback: (v) => ((v.type === "ArrayExpression" && v.elements.every(i => i.type === "Literal" && typeof i.value === "string")) || (v.type === "Literal" && v.value === null))
					},
					{ name: "Description", valueKind: "Literal", valueTypes: ["string", "null"] },
					{ name: "Cooldown", valueKind: "Literal", valueTypes: ["number"] },
					{
						name: "Flags",
						failMessage: "Object of string Literal keys and boolean Literal values, or null Literal",
						checkCallback: (v) => ((v.type === "ObjectExpression" && v.properties.every(i => i.key.type === "Literal" && typeof i.key.value === "string" && i.value.type === "Literal" && typeof i.value.value === "boolean")) || (v.type === "ArrayExpression" && v.elements.every(i => i.type === "Literal" && typeof i.value === "string")) || (v.type === "Literal" && v.value === null))
					},
					{ name: "Source", valueKind: "Literal", valueTypes: ["string"] },
					{ name: "Whitelist_Response", valueKind: "Literal", valueTypes: ["string", "null"] },
					{
						name: "Code",
						failMessage: "non-generator FunctionExpression or ArrowFunctionExpression",
						checkCallback: (v) => ((v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") && v.generator === false && (typeof v.method !== "boolean" || v.method === false))
					},
					{
						name: "Static_Data",
						failMessage: "null literal, object expression, non-generator FunctionExpression or ArrowFunctionExpression",
						checkCallback: (v) => ((v.type === "Literal" && v.value === null) || (v.type === "ObjectExpression") || ((v.type === "FunctionExpression" || v.type === "ArrowFunctionExpression") && v.generator === false && (typeof v.method !== "boolean" || v.method === false)))
					}
				];

				for (const item of properties) {
					if (item.computed === true) {
						throw new Error(`computed expressions are not allowed`);
					}
					else if (item.shorthand === true) {
						throw new Error(`shorthand expressions are not allowed`)
					}
					else if (item.kind === "set" || item.kind === "get") {
						throw new Error(`${item.kind}ter methods are not allowed`)
					}
					else if (item.value && item.value.generator === true) {
						throw new Error("generator methods are not allowed")
					}

					const found = allowedProperties.find(i => i.name === item.key.name);
					if (!found) {
						throw new Error(`property ${item.key.name} is not allowed`)
					}
					else if (found.valueKind && item.value.type !== found.valueKind) {
						throw new Error(`property ${item.key.name} has invalid value-kind ${item.value.type} - expected ${found.valueKind}`)
					}
					else if (found.valueTypes && !found.valueTypes.includes(getType(item.value.value))) {
						throw new Error(`property ${item.key.name} has invalid value-type ${typeof item.value.value} - expected ${found.valueTypes.join("|")}`)
					}
					else if (typeof found.checkCallback === "function" && !found.checkCallback(item.value)) {
						throw new Error(`property ${item.key.name} must be ${found.failMessage}`)
					}
				}
			}
		});
	});
})();