using GroszDoGrosza.Domain.Accounts;
using GroszDoGrosza.Domain.Assets;
using GroszDoGrosza.Domain.Attachments;
using GroszDoGrosza.Domain.Audit;
using GroszDoGrosza.Domain.Budgets;
using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Domain.Imports;
using GroszDoGrosza.Domain.Goals;
using GroszDoGrosza.Domain.Investments;
using GroszDoGrosza.Domain.Transactions;
using GroszDoGrosza.Domain.Subscriptions;
using GroszDoGrosza.Domain.Tags;
using GroszDoGrosza.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionSplit> TransactionSplits => Set<TransactionSplit>();
    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();
    public DbSet<ImportLog> ImportLogs => Set<ImportLog>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<CategoryRule> CategoryRules => Set<CategoryRule>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<BudgetItem> BudgetItems => Set<BudgetItem>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<InvestmentAccount> InvestmentAccounts => Set<InvestmentAccount>();
    public DbSet<InvestmentTransaction> InvestmentTransactions => Set<InvestmentTransaction>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
