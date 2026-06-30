import pandas as pd

def get_note_distribution(amount):
    """
    Implements the note distribution rules sequentially:
    1. Try to include at least one Rs.10 note whenever possible.
    2. Then include Rs.20 notes if possible.
    3. Then include one Rs.50 note if possible.
    4. Then include Rs.100 notes.
    5. Use Rs.500 notes.
    6. Fill the remaining amount using Rs.1000 notes.
    """
    n1000 = n500 = n100 = n50 = n20 = n10 = 0
    
    # 1. Try to include at least one Rs.10 note whenever possible
    if amount >= 10:
        n10 = 1
        rem = amount - 10
    else:
        n10 = 0
        rem = amount
        
    # 2. Then include Rs.20 notes if possible.
    # We want the remainder to be a multiple of 50.
    # rem - 20 * n20 = 0 mod 50 => 20 * n20 = rem mod 50.
    # Since rem is a multiple of 10, rem % 50 can be 0, 10, 20, 30, 40.
    # Target n20 mappings:
    # 0 -> 0 (0 * 20 = 0 % 50 = 0)
    # 10 -> 3 (3 * 20 = 60 % 50 = 10)
    # 20 -> 1 (1 * 20 = 20 % 50 = 20)
    # 30 -> 4 (4 * 20 = 80 % 50 = 30)
    # 40 -> 2 (2 * 20 = 40 % 50 = 40)
    target_map = {0: 0, 10: 3, 20: 1, 30: 4, 40: 2}
    rem_mod_50 = rem % 50
    target_n20 = target_map.get(rem_mod_50, 0)
    
    if rem >= 20 * target_n20:
        n20 = target_n20
    else:
        n20 = rem // 20
        
    rem -= 20 * n20
    
    # 3. Then include one Rs.50 note if possible
    # After step 2, rem is either a multiple of 50 or 10 (fallback).
    # If rem is a multiple of 50, rem % 100 is either 0 or 50.
    # We want to make the remainder a multiple of 100 by including one Rs.50 note.
    if rem % 100 == 50 and rem >= 50:
        n50 = 1
        rem -= 50
    else:
        n50 = 0
        
    # 4. Then include Rs.100 notes
    # rem is now a multiple of 100 (or 10). We want to make it a multiple of 500.
    # We include n100 notes where 100 * n100 = rem mod 500.
    if rem >= 100:
        n100 = (rem % 500) // 100
        rem -= 100 * n100
    else:
        n100 = 0
        
    # 5. Use Rs.500 notes
    # rem is now a multiple of 500 (or 10). We want to make it a multiple of 1000.
    # We include n500 notes where 500 * n500 = rem mod 1000.
    if rem >= 500:
        n500 = (rem % 1000) // 500
        rem -= 500 * n500
    else:
        n500 = 0
        
    # 6. Fill the remaining amount using Rs.1000 notes
    if rem >= 1000:
        n1000 = rem // 1000
        rem -= 1000 * n1000
    else:
        n1000 = 0
        
    # Final check / fallback for leftover
    if rem > 0:
        n10 += rem // 10
        rem = 0
        
    return {
        "Amount": amount,
        "n1000": n1000,
        "n500": n500,
        "n100": n100,
        "n50": n50,
        "n20": n20,
        "n10": n10
    }

def main():
    records = []
    print("Generating dataset...")
    for amt in range(10, 500001, 10):
        dist = get_note_distribution(amt)
        # Verify correctness
        total = (1000 * dist["n1000"] + 
                 500 * dist["n500"] + 
                 100 * dist["n100"] + 
                 50 * dist["n50"] + 
                 20 * dist["n20"] + 
                 10 * dist["n10"])
        assert total == amt, f"Error: amount {amt} got total {total}"
        records.append(dist)
        
    df = pd.DataFrame(records)
    df.to_csv("dataset.csv", index=False)
    print(f"Dataset generated and verified successfully. Total records: {len(df)}")

if __name__ == "__main__":
    main()
