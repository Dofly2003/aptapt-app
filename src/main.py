import os

def print_tree(path, prefix=""):
    files = os.listdir(path)

    for i, name in enumerate(files):
        full_path = os.path.join(path, name)

        if i == len(files) - 1:
            connector = "└── "
        else:
            connector = "├── "

        print(prefix + connector + name)

        if os.path.isdir(full_path):
            extension = "    " if i == len(files) - 1 else "│   "
            print_tree(full_path, prefix + extension)


folder = "."

print("Struktur folder dashboard:\n")
print_tree(folder)