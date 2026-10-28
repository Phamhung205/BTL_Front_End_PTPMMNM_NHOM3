using System.Text.Json;
using TranslationManager.Api.Dtos;
using TranslationManager.Api.Support;

var count = 0;
void Check(bool ok, string label) { if (!ok) throw new Exception(label); count++; Console.WriteLine("PASS " + label); }
void Invalid(ImportSourceRequest request, string label)
{
    try { SourceDocument.Read(request); throw new Exception("Accepted invalid source: " + label); }
    catch (ApiException ex) { Check(ex.StatusCode == 400, label); }
}
var source = SourceDocument.Read(new("v1", RawJson: "{\"Title\":\"Chào {name}\",\"title\":\"Hi\",\"menu\":{\"open\":\"Mở\"}}"));
Check(source.Count == 3 && source["menu.open"] == "Mở" && source["Title"] == "Chào {name}", "Nested Unicode and case-sensitive keys");
using var legacy = JsonDocument.Parse("{\"hello\":\"Hello\"}");
Check(SourceDocument.Read(new("legacy", legacy.RootElement))["hello"] == "Hello", "Existing data clients remain supported");
Invalid(new("mixed", legacy.RootElement, "{}"), "Reject ambiguous data and rawJson");
Invalid(new("empty"), "Reject missing source");
foreach (var json in new[] { "{", "{}", "[]", "\"text\"", "{\"x\":1}", "{\"x\":null}", "{\"x\":[]}", "{\"x\":{}}", "{\" x\":\"x\"}", "{\"x\":\"a\",\"x\":\"b\"}" })
    Invalid(new("invalid", RawJson: json), "Reject invalid source " + json);
Invalid(new("long", RawJson: JsonSerializer.Serialize(new Dictionary<string, string> { [new string('k', 501)] = "x" })), "Reject key path over 500 chars");
Invalid(new("long", RawJson: JsonSerializer.Serialize(new { x = new string('a', 10001) })), "Reject string over 10000 chars");
Invalid(new("large", RawJson: new string(' ', SourceDocument.MaxBytes) + "{}"), "Enforce 2 MB before parsing");
Invalid(new("deep", RawJson: string.Concat(Enumerable.Repeat("{\"x\":", 66)) + "\"leaf\"" + new string('}', 66)), "Reject excessive nesting");
var large = JsonSerializer.Serialize(Enumerable.Range(0, 180).ToDictionary(i => "key" + i, _ => new string('a', 7000)));
Check(SourceDocument.Read(new("large-valid", RawJson: large)).Count == 180, "Accept valid source larger than old 1 MB gateway limit");
Check(JsonTree.Unflatten(source).Contains("Mở"), "Unicode snapshot remains readable");
Check(SourceDocument.Read(new("dotted", RawJson: "{\"a.b\":\"x\"}"))["a.b"] == "x", "Dotted keys use the same nested path convention");
Invalid(new("collision", RawJson: "{\"a\":\"x\",\"a.b\":\"y\"}"), "Reject parent and child collision");
Invalid(new("duplicate-path", RawJson: "{\"a.b\":\"x\",\"a\":{\"b\":\"y\"}}"), "Reject duplicate normalized path");
Console.WriteLine($"Completed {count} source document checks without a database.");
