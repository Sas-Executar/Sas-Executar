import { AiMessage, type UIMessage } from "@repo/ai";
import { ArrowUp, Check, Plus, Sparkles, X } from "lucide-react";
import type { FormEvent } from "react";
import type { AprovacaoCopiloto } from "@/lib/executar/domain";

/**
 * Tipos, constantes e componentes do painel do Copiloto — extraído de
 * executar-operacional.tsx na correção estrutural da auditoria de
 * 02/09/2026. `CopilotMode`/`COPILOT_MODES`/`MensagemCopiloto` seguem
 * exportados daqui porque o componente principal também precisa deles
 * (estado do modo ativo, histórico de mensagens) — não é um tipo exclusivo
 * deste painel, só colocado aqui por afinidade com o resto do Copiloto.
 */
export type CopilotMode = "automatic" | "local";

export interface MensagemCopiloto {
  readonly author: "pessoa" | "copiloto";
  readonly id: string;
  readonly text: string;
}

interface CopilotModeOption {
  readonly description: string;
  readonly id: CopilotMode;
  readonly label: string;
}

export function criarMensagemCopiloto(
  author: MensagemCopiloto["author"],
  text: string
): MensagemCopiloto {
  return { author, id: crypto.randomUUID(), text };
}

export function paraMensagemUi(message: MensagemCopiloto): UIMessage {
  return {
    id: message.id,
    role: message.author === "pessoa" ? "user" : "assistant",
    parts: [{ type: "text", text: message.text }],
  };
}

export const COPILOT_MODES = [
  {
    id: "automatic",
    label: "Automático",
    description: "Usa a IA quando disponível e continua no modo local.",
  },
  {
    id: "local",
    label: "Operacional local",
    description:
      "Executa os comandos sem modelo externo e sem custo adicional.",
  },
] as const satisfies readonly CopilotModeOption[];

interface CopilotModelSelectorProperties {
  readonly activeMode: CopilotMode;
  readonly onClose: () => void;
  readonly onSelect: (mode: CopilotMode) => void;
  readonly open: boolean;
  readonly remoteAvailable: boolean;
}

export function CopilotModelSelector({
  activeMode,
  onClose,
  onSelect,
  open,
  remoteAvailable,
}: CopilotModelSelectorProperties) {
  if (!open) {
    return null;
  }

  return (
    <div className="executarModelLayer">
      <button
        aria-label="Fechar seletor de modelo"
        className="executarFloatingBackdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="executar-modelo-titulo"
        aria-modal="true"
        className="executarModelSelector"
        role="dialog"
      >
        <div className="executarModelSelectorHead">
          <div>
            <small>COPILOTO</small>
            <h2 id="executar-modelo-titulo">Modelo de execução</h2>
          </div>
          <button
            aria-label="Fechar seletor de modelo"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <fieldset className="executarModelOptions">
          <legend className="executarVisuallyHidden">
            Modelos disponíveis
          </legend>
          {COPILOT_MODES.map((mode) => (
            <label key={mode.id}>
              <input
                checked={activeMode === mode.id}
                name="executar-copilot-mode"
                onChange={() => onSelect(mode.id)}
                type="radio"
                value={mode.id}
              />
              <span className="executarModelOptionIcon">
                {mode.id === "automatic" ? (
                  <Sparkles aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">E</span>
                )}
              </span>
              <span>
                <b>{mode.label}</b>
                <small>{mode.description}</small>
              </span>
              {activeMode === mode.id && <Check aria-hidden="true" />}
            </label>
          ))}
        </fieldset>
        <p className="executarModelStatus">
          {remoteAvailable
            ? "A integração remota está disponível para o modo automático."
            : "Sem integração remota: o modo automático permanece local e sem custo externo."}
        </p>
      </section>
    </div>
  );
}

interface CopilotCommandPanelProperties {
  readonly onSelect: (command: string) => void;
  readonly open: boolean;
}

function CopilotCommandPanel({
  onSelect,
  open,
}: CopilotCommandPanelProperties) {
  if (!open) {
    return null;
  }

  return (
    <div className="executarCommandPanel">
      <div className="executarComandos">
        {["/agora", "/progresso", "/concluir"].map((command) => (
          <button
            className="chip"
            key={command}
            onClick={() => onSelect(command)}
            type="button"
          >
            {command}
          </button>
        ))}
      </div>
      <details className="executarAjudaCopiloto">
        <summary>Todos os comandos</summary>
        <small>/projeto criar Nome</small>
        <small>/foco ID · /progresso · /concluir ID</small>
        <small>/evidencia verificar descrição</small>
        <small>/entrega atualizar ID data=DD/MM</small>
        <small>/replanejamento ID data=DD/MM</small>
      </details>
    </div>
  );
}

interface CopilotPanelProperties {
  readonly activeModeLabel: string;
  readonly commandMenuOpen: boolean;
  readonly loading: boolean;
  readonly message: string;
  readonly messages: readonly MensagemCopiloto[];
  readonly modelSelectorOpen: boolean;
  readonly onClose: () => void;
  readonly onDecideApproval: (approved: boolean) => void;
  readonly onMessageChange: (message: string) => void;
  readonly onModelToggle: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onToggleCommands: () => void;
  readonly open: boolean;
  readonly pendingApproval: AprovacaoCopiloto | null;
}

export function CopilotPanel({
  activeModeLabel,
  commandMenuOpen,
  loading,
  message,
  messages,
  modelSelectorOpen,
  onClose,
  onDecideApproval,
  onMessageChange,
  onModelToggle,
  onSubmit,
  onToggleCommands,
  open,
  pendingApproval,
}: CopilotPanelProperties) {
  if (!open) {
    return null;
  }

  return (
    <aside aria-label="Copiloto operacional" className="executarCopiloto">
      <div className="executarCopilotoHead">
        <div>
          <b>Copiloto EXECUTAR</b>
          <small>Mesmo plano · mesma organização</small>
        </div>
        <div className="executarCopilotoHeadActions">
          <button
            aria-expanded={modelSelectorOpen}
            className="executarCopilotModelTrigger"
            onClick={onModelToggle}
            type="button"
          >
            <Sparkles aria-hidden="true" />
            <span>{activeModeLabel}</span>
          </button>
          <button
            aria-label="Fechar Copiloto"
            className="iconBtn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
      </div>
      <div aria-live="polite" className="executarMensagens">
        {messages.map((entry) => (
          <AiMessage
            className={`executarMensagem ${entry.author}`}
            data={paraMensagemUi(entry)}
            key={entry.id}
          />
        ))}
        {pendingApproval && (
          <div className="executarAprovacao">
            <strong>Aprovação humana necessária</strong>
            <p>{pendingApproval.summary}</p>
            <div className="executarFieldRow">
              <button
                className="primaryBtn"
                onClick={() => onDecideApproval(true)}
                type="button"
              >
                Aprovar ação
              </button>
              <button
                className="softBtn"
                onClick={() => onDecideApproval(false)}
                type="button"
              >
                Recusar
              </button>
            </div>
          </div>
        )}
      </div>
      <CopilotCommandPanel onSelect={onMessageChange} open={commandMenuOpen} />
      <form className="executarChatForm" onSubmit={onSubmit}>
        <button
          aria-expanded={commandMenuOpen}
          aria-label="Abrir comandos do Copiloto"
          className="executarChatUtilityButton"
          onClick={onToggleCommands}
          type="button"
        >
          <Plus aria-hidden="true" />
        </button>
        <textarea
          aria-label="Mensagem ao Copiloto"
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Pergunte ao Copiloto"
          rows={1}
          value={message}
        />
        <button
          aria-label={loading ? "Consultando" : "Enviar mensagem"}
          className="executarChatSubmit"
          disabled={loading || !message.trim()}
          type="submit"
        >
          {loading ? (
            <span aria-hidden="true" className="executarChatLoader" />
          ) : (
            <ArrowUp aria-hidden="true" />
          )}
        </button>
      </form>
    </aside>
  );
}
