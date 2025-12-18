using Google.OrTools.LinearSolver;
using System;
using System.Collections.Generic;
using System.Text.Json;

class Part
{
    public string id { get; set; } = string.Empty;

    public string? category { get; set; }
    public string? name { get; set; }
    public string? eng_name { get; set; }

    public int power { get; set; }
    public int durability { get; set; }
    public int weight { get; set; }
    public int maxCount { get; set; }

    public int build_hp { get; set; }
}

class InputData
{
    public int maxPower { get; set; }
    public int maxWeight { get; set; }
    public int maxParts { get; set; }

    public List<Part> parts { get; set; } = new();
}

class OutputData
{
    public double maxDurability { get; set; }

    public int totalPower { get; set; }
    public int totalWeight { get; set; }
    public int totalParts { get; set; }

    // id -> count
    public Dictionary<string, int> solution { get; set; } = new();
}

class Program
{
    static void Main()
    {
        string? inputJson = Console.ReadLine();

        if (string.IsNullOrWhiteSpace(inputJson))
        {
            Console.Error.WriteLine("Empty input");
            return;
        }

        InputData? input;

        try
        {
            input = JsonSerializer.Deserialize<InputData>(inputJson);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Invalid JSON: " + ex.Message);
            return;
        }

        if (input == null || input.parts.Count == 0)
        {
            Console.Error.WriteLine("No parts provided");
            return;
        }

        Solver solver = Solver.CreateSolver("SCIP");
        if (solver == null)
        {
            Console.Error.WriteLine("Solver not created");
            return;
        }

        int n = input.parts.Count;
        Variable[] x = new Variable[n];

        for (int i = 0; i < n; i++)
        {
            x[i] = solver.MakeIntVar(
                0,
                input.parts[i].maxCount,
                $"x{i}"
            );
        }

        Constraint power = solver.MakeConstraint(0, input.maxPower);
        Constraint weight = solver.MakeConstraint(0, input.maxWeight);
        Constraint count = solver.MakeConstraint(0, input.maxParts);

        for (int i = 0; i < n; i++)
        {
            power.SetCoefficient(x[i], input.parts[i].power);
            weight.SetCoefficient(x[i], input.parts[i].weight);
            count.SetCoefficient(x[i], 1);
        }

        Objective obj = solver.Objective();
        for (int i = 0; i < n; i++)
        {
            obj.SetCoefficient(x[i], input.parts[i].durability);
        }
        obj.SetMaximization();

        var status = solver.Solve();
        if (status != Solver.ResultStatus.OPTIMAL &&
            status != Solver.ResultStatus.FEASIBLE)
        {
            Console.Error.WriteLine($"Solver failed: {status}");
            return;
        }

        var result = new OutputData
        {
            maxDurability = obj.Value()
        };

        for (int i = 0; i < n; i++)
        {
            int countValue = (int)x[i].SolutionValue();
            if (countValue <= 0)
                continue;

            var part = input.parts[i];

            result.solution[part.id] = countValue;

            result.totalParts += countValue;
            result.totalPower += part.power * countValue;
            result.totalWeight += part.weight * countValue;
        }

        Console.WriteLine(JsonSerializer.Serialize(
            result,
            new JsonSerializerOptions { WriteIndented = true }
        ));
    }
}
