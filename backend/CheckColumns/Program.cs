using Npgsql;

var connectionString = "Host=localhost;Database=mieszkania_db;Username=postgres;Password=root";

try
{
    using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    
    Console.WriteLine("🔵 Połączono z bazą danych");
    
    var sql = @"
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'properties'
    ORDER BY ordinal_position;";
    
    using var cmd = new NpgsqlCommand(sql, conn);
    using var reader = await cmd.ExecuteReaderAsync();
    
    Console.WriteLine("\n=== Kolumny w tabeli properties ===");
    Console.WriteLine($"{"Nazwa",-30} {"Typ",-20} {"Nullable",-10} {"Domyślna"}");
    Console.WriteLine(new string('-', 80));
    
    while (await reader.ReadAsync())
    {
        var name = reader.GetString(0);
        var type = reader.GetString(1);
        var nullable = reader.GetString(2);
        var defaultVal = reader.IsDBNull(3) ? "" : reader.GetString(3);
        Console.WriteLine($"{name,-30} {type,-20} {nullable,-10} {defaultVal}");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Błąd: {ex.Message}");
    return 1;
}

return 0;
