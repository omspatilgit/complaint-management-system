import sqlite3, textwrap
from pathlib import Path
DB=Path(__file__).resolve().parent/"complaints.db"
WIDTHS=[5,30,14,14,56]
def rows():
    with sqlite3.connect(DB) as con: return con.execute("SELECT id,title,department,status,description FROM complaints ORDER BY id").fetchall()
def show(data):
    headers=("ID","TITLE","DEPARTMENT","STATUS","DESCRIPTION")
    print("\nClearDesk database - press R to refresh, Q to quit\n")
    print(" | ".join(h.ljust(w) for h,w in zip(headers,WIDTHS)))
    print("-+-".join("-"*w for w in WIDTHS))
    for row in data:
        wrapped=[textwrap.wrap(str(v),w) or [""] for v,w in zip(row,WIDTHS)]
        for i in range(max(map(len,wrapped))): print(" | ".join((col[i] if i<len(col) else "").ljust(WIDTHS[j]) for j,col in enumerate(wrapped)))
        print("-+-".join("-"*w for w in WIDTHS))
if __name__=="__main__":
    while True:
        show(rows()); key=input("R refresh | Q quit: ").strip().lower()
        if key=="q": break
        if key!="r":
            print("Press R to refresh or Q to quit.")
            while True:
                key=input("R refresh | Q quit: ").strip().lower()
                if key in ("r","q"): break
            if key=="q": break
