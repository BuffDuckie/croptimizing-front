// KaTeX source for the Method page. Kept in one place so it is easy to audit.
export const F = {
  objective: String.raw`\max_{w}\; (1-\rho)\,\overline{\pi}_{\text{worst 20\%}}(w) \;+\; \rho\,\frac{1}{S}\sum_{s=1}^{S}\pi_s(w)`,
  profit: String.raw`\pi_s(w) = \sum_{i} w_i\,\pi_{i,s}`,
  water: String.raw`\sum_{i} w_i\, W_{i,s} \;\le\; W_{\text{cap}} \quad \text{for every year } s`,
  soil: String.raw`\sum_{i} w_i\, h_i \;\ge\; H_{\min}, \qquad \sum_i w_i = 1, \qquad 0 \le w_i \le m_i`,
  cvar: String.raw`\overline{\pi}_{\text{worst 20\%}}(w) = \frac{1}{4}\sum_{s \,\in\, \text{4 lowest years}} \pi_s(w) \;=\; -\,\mathrm{CVaR}_{80\%}\!\big(-\pi(w)\big)`,
  shadow: String.raw`\lambda_{\text{water}} \approx \frac{J^{*}(W_{\text{cap}} + 0.1) - J^{*}(W_{\text{cap}})}{0.1}`,
  et: String.raw`ET_c = K_c \times ET_0, \qquad W_{i,s} = \frac{ET_{c,i,s} - P_{\text{eff},s}}{\eta}`,
} as const;
