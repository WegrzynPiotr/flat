using Npgsql;

var connectionString = "Host=localhost;Database=mieszkania_db;Username=postgres;Password=admin";

var sql = @"
ALTER TABLE ""Properties""
ADD COLUMN ""Photos"" TEXT DEFAULT '[]',
ADD COLUMN ""Description"" TEXT;

UPDATE ""Properties""
SET ""Photos"" = '[]'
WHERE ""Photos"" IS NULL;
";

try
{
    using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    
    using var cmd = new NpgsqlCommand(sql, conn);
    await cmd.ExecuteNonQueryAsync();
    
    Console.WriteLine("✅ Migracja wykonana pomyślnie!");
    Console.WriteLine("Dodano kolumny: Photos i Description do tabeli Properties");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Błąd migracji: {ex.Message}");
    return 1;
}

return 0;
