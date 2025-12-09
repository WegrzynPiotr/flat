using Npgsql;

var connectionString = "Host=localhost;Database=mieszkania_db;Username=postgres;Password=root";

try
{
    using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    
    Console.WriteLine("🔵 Połączono z bazą danych");
    
    var sql = "ALTER TABLE properties ADD COLUMN documents TEXT DEFAULT '[]';";
    
    using var cmd = new NpgsqlCommand(sql, conn);
    await cmd.ExecuteNonQueryAsync();
    
    Console.WriteLine("✅ Kolumna documents dodana pomyślnie!");
    
    // Verify
    var verifySql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'documents';";
    using var verifyCmd = new NpgsqlCommand(verifySql, conn);
    using var reader = await verifyCmd.ExecuteReaderAsync();
    
    if (await reader.ReadAsync())
    {
        Console.WriteLine($"✅ Zweryfikowano: kolumna '{reader.GetString(0)}' istnieje");
    }
}
catch (Npgsql.PostgresException ex) when (ex.SqlState == "42701")
{
    Console.WriteLine("⚠️ Kolumna documents już istnieje");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Błąd: {ex.Message}");
    return 1;
}

return 0;
