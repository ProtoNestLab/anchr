export class AgentParser {
  private static AGENT_PREFIX = '@agent'

  static isAgentCommand(content: string): boolean {
    return content.trim().startsWith(AgentParser.AGENT_PREFIX)
  }

  static extractQuery(content: string): string {
    if (!AgentParser.isAgentCommand(content)) {
      return content
    }
    return content.slice(AgentParser.AGENT_PREFIX.length).trim()
  }
}
