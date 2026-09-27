using GroszDoGrosza.Application.Common.Abstractions;
using GroszDoGrosza.Application.Auth.Abstractions;
using GroszDoGrosza.Application.Categories.Abstractions;
using GroszDoGrosza.Application.Imports.Abstractions;
using GroszDoGrosza.Application.Imports;
using GroszDoGrosza.Infrastructure.Auth;
using GroszDoGrosza.Infrastructure.Categories;
using GroszDoGrosza.Infrastructure.Common;
using GroszDoGrosza.Infrastructure.Imports;
using GroszDoGrosza.Infrastructure.Imports.PeKaO;
using GroszDoGrosza.Infrastructure.Imports.Parsers;
using GroszDoGrosza.Infrastructure.Imports.Profiles;
using GroszDoGrosza.Infrastructure.Imports.Detection;
using GroszDoGrosza.Infrastructure.Imports.Mapping;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GroszDoGrosza.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseNpgsql(connectionString);
        });

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICategoryRuleMatcher, CategoryRuleMatcher>();
        services.AddScoped<IImportDeduplicationService, ImportDeduplicationService>();
        services.AddScoped<ITransactionImportParser, PeKaOCsvParserAdapter>();
        services.AddScoped<ITransactionImportService, TransactionImportService>();
        services.AddScoped<ICsvParser, CsvParser>();
        services.AddScoped<BankDetector>();
        services.AddScoped<TransactionMapper>();
        services.AddScoped<IImportService, ImportService>();
        services.AddScoped<IBankProfile, PekaoProfile>();
        services.AddScoped<IBankProfile, PKOProfile>();
        services.AddScoped<IBankProfile, INGProfile>();
        services.AddScoped<IBankProfile, MillenniumProfile>();
        services.AddScoped<IBankProfile, SantanderProfile>();
        services.AddSingleton<IClock, SystemClock>();

        return services;
    }
}
