using System;
using System.Threading.Tasks;
using Core.Models;

namespace Core.Interfaces
{
	public interface IRefreshTokenRepository
	{
		Task<RefreshToken> GetByTokenAsync(string token);
		Task<RefreshToken> AddAsync(RefreshToken refreshToken);
		Task UpdateAsync(RefreshToken refreshToken);
		Task DeleteByUserIdAsync(Guid userId);
	}
}
