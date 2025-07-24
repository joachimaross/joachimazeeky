"""main.py
Entry point for Zeeky AI assistant. Provides a simple interactive
command-line interface (CLI).
"""

import os
import argparse
from dotenv import load_dotenv
from rich.console import Console
from rich.prompt import Prompt
from zeeky import ZeekyAssistant

console = Console()


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Zeeky – Ultimate AI Assistant (CLI)")
    parser.add_argument(
        "--model",
        "-m",
        default=os.getenv("ZEEKY_MODEL", "gpt-4o-mini"),
        help="OpenAI model name to use (default: env ZEEKY_MODEL or gpt-4o-mini)",
    )
    return parser.parse_args()


def main() -> None:
    """Start interactive Zeeky session."""
    load_dotenv()

    if not os.getenv("OPENAI_API_KEY"):
        console.print("[bold red]ERROR:[/bold red] OPENAI_API_KEY environment variable not set.")
        console.print("Create a .env file (see .env.example) or export the key, then retry.")
        raise SystemExit(1)

    args = parse_args()
    assistant = ZeekyAssistant(model=args.model)

    console.print("[bold green]Welcome to Zeeky![/bold green] Type 'exit' or 'quit' to leave.")

    while True:
        try:
            user_input = Prompt.ask("[cyan]You[/cyan]")
        except (KeyboardInterrupt, EOFError):
            console.print()  # newline
            break

        if user_input.lower() in {"exit", "quit"}:
            break

        with console.status("[dim]Zeeky is thinking…[/dim]"):
            reply = assistant.chat(user_input)
        console.print(f"[magenta]Zeeky:[/magenta] {reply}\n")


if __name__ == "__main__":
    main()