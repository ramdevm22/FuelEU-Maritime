# Reflection — FuelEU Maritime Assignment

## What I Learned Using AI Agents

Working with Claude and Copilot on this assignment fundamentally changed how I approach architectural decisions. Rather than immediately writing code, I used the agent to think through the hexagonal pattern first — describing the ports and adapters in natural language before generating a single line of TypeScript. This produced a much cleaner separation of concerns than I typically achieve when coding top-down.

The most valuable lesson was learning *what to delegate and what to verify*. Agents are excellent at generating boilerplate (Express handlers, repository implementations, TypeScript interfaces) but they introduce subtle bugs in ordering-sensitive code — like the Express route registration order issue where `/comparison` was placed after `/:routeId/baseline`. Without understanding how Express resolves routes, I would have accepted that output uncritically.

## Efficiency Gains vs Manual Coding

The agent reduced time on:
- **Scaffolding** (~80% faster): The full directory structure, all port interfaces, and domain entities were generated in minutes rather than an hour of manual typing
- **Tests** (~60% faster): Mock-based unit tests for all five use cases were generated with correct Jest/Vitest patterns, needing only minor adjustments for edge cases
- **Documentation** (~70% faster): README structure, API tables, and workflow docs drafted quickly from prompts

Manual effort was still essential for:
- Verifying formula correctness against the FuelEU regulation spec
- Identifying and fixing route ordering and URL bugs
- Ensuring the greedy pool allocation logic actually matched the spec rules

## Improvements I'd Make Next Time

1. **Prompt for one file at a time** rather than entire directory trees — the brace-expansion bug only happened because I asked for a complex scaffold in one command
2. **Write spec tests first**, then ask the agent to make them pass — this would have caught the route ordering bug before integration
3. **Ask the agent to review its own output** with a follow-up prompt like "what could go wrong with this Express router?" — this surfaces gotchas the agent knows about but doesn't mention proactively
4. **Use Claude Code** for multi-file refactors instead of copy-pasting between chat turns — context loss between turns was the main source of inconsistency
