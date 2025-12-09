using Npgsql;

namespace MigrationTool;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=mieszkania_db;Username=postgres;Password=root";

        var sql = @"
ALTER TABLE properties
ADD COLUMN photos TEXT DEFAULT '[]',
ADD COLUMN description TEXT;

UPDATE properties
SET photos = '[]'
WHERE photos IS NULL;
";

        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            
            Console.WriteLine("🔵 Łączenie z bazą danych...");
            
            using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            
            Console.WriteLine("✅ Migracja wykonana pomyślnie!");
            Console.WriteLine("Dodano kolumny: Photos i Description do tabeli Properties");
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42701")
        {
            Console.WriteLine("⚠️ Kolumny już istnieją w bazie danych");
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Błąd migracji: {ex.Message}");
            return 1;
        }

        return 0;
    }
}
