using GroszDoGrosza.Domain.Attachments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.ToTable("Attachments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.FileName).HasMaxLength(512).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(128).IsRequired();
        builder.Property(x => x.StoragePath).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.Checksum).HasMaxLength(128);
    }
}
