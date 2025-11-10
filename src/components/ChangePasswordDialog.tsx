import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ChangePasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const resetForm = () => {
		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!currentPassword || !newPassword || !confirmPassword) {
			toast.error("Preencha todos os campos");
			return;
		}

		if (newPassword.length < 8) {
			toast.error("A nova senha deve ter pelo menos 8 caracteres");
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error("A confirmação da nova senha não confere");
			return;
		}

		setLoading(true);
		try {
			const { data: { user }, error: getUserError } = await supabase.auth.getUser();
			if (getUserError || !user || !user.email) {
				toast.error("Usuário não autenticado");
				setLoading(false);
				return;
			}

			// Verificar senha atual reautenticando
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPassword,
			});
			if (signInError) {
				toast.error("Senha atual incorreta");
				setLoading(false);
				return;
			}

			// Atualizar para a nova senha
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});
			if (updateError) {
				toast.error("Não foi possível alterar a senha");
				setLoading(false);
				return;
			}

			toast.success("Senha alterada com sucesso");
			toast.message?.("Importante", {
				description: "Sua senha foi atualizada com sucesso.",
			} as any);

			// Encerrar sessão e redirecionar para login
			await supabase.auth.signOut();
			onOpenChange(false);
			resetForm();
			navigate("/auth");
		} catch (err) {
			toast.error("Erro ao alterar senha");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
			<DialogContent className="max-w-md">
				<DialogHeader className="space-y-1">
					<DialogTitle>Alterar senha</DialogTitle>
					<DialogDescription>
						Informe sua senha atual e defina uma nova senha.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="currentPassword">Senha atual</Label>
						<Input
							id="currentPassword"
							type="password"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							placeholder="Sua senha atual"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="newPassword">Nova senha</Label>
						<Input
							id="newPassword"
							type="password"
							autoComplete="new-password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Mínimo de 8 caracteres"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirmar nova senha</Label>
						<Input
							id="confirmPassword"
							type="password"
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Repita a nova senha"
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Salvando..." : "Alterar senha"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}


