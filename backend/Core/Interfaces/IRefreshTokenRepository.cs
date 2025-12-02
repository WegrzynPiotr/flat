using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Core.Models;

namespace Core.Interfaces
{
	public interface IRefreshTokenRepository
	{
		Task<RefreshToken> GetByTokenAsync(string token);
		Task<IEnumerable<RefreshToken>> GetAllByUserIdAsync(Guid userId);
		Task<RefreshToken> AddAsync(RefreshToken refreshToken);
		Task UpdateAsync(RefreshToken refreshToken);
		Task DeleteByUserIdAsync(Guid userId);
	}
}
