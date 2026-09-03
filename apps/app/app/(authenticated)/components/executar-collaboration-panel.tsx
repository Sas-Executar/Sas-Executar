import { type FormEvent, useState } from "react";
import {
  comentariosEntrega,
  etapasOnboarding,
  marcarNotificacaoLida,
  notificacoesOperacionais,
  presencasAtivas,
  registrarComentario,
} from "@/lib/executar/distribution";
import type { AtorOperacional, EstadoOperacional } from "@/lib/executar/domain";
import { entregasAtivas } from "@/lib/executar/domain";

/**
 * Painel de equipe/colaboração (presença, avisos, comentários por
 * entrega) — extraído de executar-operacional.tsx na correção estrutural
 * da auditoria de 02/09/2026. Auto-contido: possui seu próprio estado de
 * formulário, só recebe `actor`/`state`/`setState`/`onClose` de fora.
 */
export function CollaborationPanel({
  actor,
  onClose,
  setState,
  state,
}: {
  readonly actor: AtorOperacional;
  readonly onClose: () => void;
  readonly setState: (state: EstadoOperacional) => void;
  readonly state: EstadoOperacional;
}) {
  const tasks = entregasAtivas(state);
  const [taskId, setTaskId] = useState(state.focus ?? tasks[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const activeTaskId = tasks.some((task) => task.id === taskId)
    ? taskId
    : (state.focus ?? tasks[0]?.id ?? "");
  const comments = activeTaskId
    ? comentariosEntrega(state, actor, activeTaskId)
    : [];
  const notifications = notificacoesOperacionais(state, actor);
  const participants = presencasAtivas(state, actor);
  const nextOnboarding = etapasOnboarding(state, actor).find(
    (step) => !step.complete
  );

  function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeTaskId) {
      return;
    }

    try {
      setState(
        registrarComentario(state, actor, activeTaskId, message, {
          organizationId: actor.organizationId,
          userIds: [actor.userId],
        })
      );
      setMessage("");
      setProblem("");
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o comentário."
      );
    }
  }

  function readNotification(notificationId: string) {
    try {
      setState(marcarNotificacaoLida(state, actor, notificationId));
      setProblem("");
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o aviso."
      );
    }
  }

  return (
    <aside
      aria-label="Colaboração operacional"
      className="executarCopiloto executarColaboracao"
    >
      <div className="executarCopilotoHead">
        <div>
          <b>Equipe e avisos</b>
          <small>Mesmo projeto · organização protegida</small>
        </div>
        <button
          aria-label="Fechar colaboração"
          className="iconBtn"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="executarMensagens executarPainelColaboracao">
        <section aria-labelledby="executar-presenca-titulo">
          <h3 id="executar-presenca-titulo">Presença no projeto</h3>
          <div className="executarParticipantes">
            {participants.map((participant) => (
              <span className="chip" key={participant.userId}>
                {participant.displayName}
                {participant.taskId ? ` · ${participant.taskId}` : ""}
              </span>
            ))}
            {!participants.length && <small>Nenhuma presença recente.</small>}
          </div>
          <small>
            Modo local. Colaboração remota depende da integração final.
          </small>
        </section>

        <section aria-labelledby="executar-avisos-titulo">
          <h3 id="executar-avisos-titulo">Avisos operacionais</h3>
          <div className="executarAvisos">
            {notifications.slice(0, 8).map((notification) => (
              <article
                className={`executarAviso ${notification.read ? "lido" : "novo"}`}
                key={notification.id}
              >
                <b>{notification.title}</b>
                <small>{notification.body}</small>
                {!notification.read && (
                  <button
                    className="softBtn"
                    onClick={() => readNotification(notification.id)}
                    type="button"
                  >
                    Marcar como lido
                  </button>
                )}
              </article>
            ))}
            {!notifications.length && (
              <small>Nenhum aviso operacional neste projeto.</small>
            )}
          </div>
        </section>

        <section aria-labelledby="executar-comentarios-titulo">
          <h3 id="executar-comentarios-titulo">Comentários por entrega</h3>
          <label htmlFor="executar-entrega-comentario">Entrega</label>
          <select
            id="executar-entrega-comentario"
            onChange={(event) => setTaskId(event.target.value)}
            value={activeTaskId}
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.id} · {task.title}
              </option>
            ))}
          </select>
          <div aria-live="polite" className="executarComentarios">
            {comments.map((entry) => (
              <article className="executarComentario" key={entry.id}>
                <b>{entry.authorName}</b>
                <span>{entry.body}</span>
              </article>
            ))}
            {!comments.length && (
              <small>Nenhum comentário nesta entrega.</small>
            )}
          </div>
        </section>

        {nextOnboarding && (
          <output className="executarOnboarding">
            <b>Próxima etapa</b>
            <span>{nextOnboarding.title}</span>
          </output>
        )}
        {problem && (
          <p className="executarErro" role="alert">
            {problem}
          </p>
        )}
      </div>
      <form className="executarChatForm" onSubmit={sendComment}>
        <input
          aria-label="Comentário da entrega"
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Registrar comentário operacional"
          value={message}
        />
        <button className="primaryBtn" disabled={!activeTaskId} type="submit">
          Enviar
        </button>
      </form>
    </aside>
  );
}
