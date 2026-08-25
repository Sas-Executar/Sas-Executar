#!/usr/bin/env python3
"""
Empacota uma habilidade de análise de dados em arquivo ZIP distribuível.

Uso:
    python empacotar_habilidade_dados.py <caminho-da-habilidade> [diretorio-de-saida]

Exemplo:
    python empacotar_habilidade_dados.py /home/claude/empresa-analise-dados
    python empacotar_habilidade_dados.py /home/claude/empresa-analise-dados /tmp/saidas
"""

import sys
import zipfile
from pathlib import Path


def validar_habilidade(caminho_habilidade: Path) -> tuple[bool, str]:
    """Executa validações básicas da estrutura da habilidade."""

    arquivo_habilidade = caminho_habilidade / "SKILL.md"
    if not arquivo_habilidade.exists():
        return False, "Arquivo SKILL.md ausente"

    conteudo = arquivo_habilidade.read_text(encoding="utf-8")
    if not conteudo.startswith("---"):
        return False, "SKILL.md sem metadados YAML iniciais"

    if "name:" not in conteudo[:500]:
        return False, "SKILL.md sem campo estrutural obrigatório 'name'"

    if "description:" not in conteudo[:1000]:
        return False, "SKILL.md sem campo estrutural obrigatório 'description'"

    marcadores = [
        "<ORGANIZACAO>",
        "<DEFINICAO>",
        "<TABELA>",
        "<CONSULTA>",
        "<FORMULA>",
    ]
    encontrados = [marcador for marcador in marcadores if marcador in conteudo]
    if encontrados:
        return False, f"SKILL.md contém marcadores ainda não preenchidos: {', '.join(encontrados)}"

    return True, "Validação concluída com sucesso"


def empacotar_habilidade(caminho: str, diretorio_saida: str | None = None) -> Path | None:
    """Empacota uma pasta de habilidade em arquivo ZIP."""

    caminho_habilidade = Path(caminho).resolve()

    if not caminho_habilidade.exists():
        print(f"Erro: pasta da habilidade não encontrada: {caminho_habilidade}")
        return None

    if not caminho_habilidade.is_dir():
        print(f"Erro: o caminho informado não é uma pasta: {caminho_habilidade}")
        return None

    print("Validando habilidade...")
    valido, mensagem = validar_habilidade(caminho_habilidade)
    if not valido:
        print(f"Falha na validação: {mensagem}")
        return None

    print(f"{mensagem}\n")

    nome_habilidade = caminho_habilidade.name
    caminho_saida = Path(diretorio_saida).resolve() if diretorio_saida else Path.cwd()
    caminho_saida.mkdir(parents=True, exist_ok=True)
    arquivo_saida = caminho_saida / f"{nome_habilidade}.zip"

    try:
        with zipfile.ZipFile(arquivo_saida, "w", zipfile.ZIP_DEFLATED) as arquivo_zip:
            for caminho_arquivo in caminho_habilidade.rglob("*"):
                if not caminho_arquivo.is_file():
                    continue

                if any(parte.startswith(".") for parte in caminho_arquivo.parts):
                    continue

                if caminho_arquivo.name in {"__pycache__", ".DS_Store", "Thumbs.db"}:
                    continue

                nome_interno = caminho_arquivo.relative_to(caminho_habilidade.parent)
                arquivo_zip.write(caminho_arquivo, nome_interno)
                print(f"  Adicionado: {nome_interno}")

        print(f"\nHabilidade empacotada com sucesso em: {arquivo_saida}")
        return arquivo_saida

    except Exception as erro:
        print(f"Erro ao criar arquivo ZIP: {erro}")
        return None


def principal() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    caminho_habilidade = sys.argv[1]
    diretorio_saida = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Empacotando habilidade: {caminho_habilidade}")
    if diretorio_saida:
        print(f"Diretório de saída: {diretorio_saida}")
    print()

    resultado = empacotar_habilidade(caminho_habilidade, diretorio_saida)
    sys.exit(0 if resultado else 1)


if __name__ == "__main__":
    principal()
